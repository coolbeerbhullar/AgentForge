
import OpenAI from "openai";
import { NextResponse } from "next/server";

type Agent = {
  id: string;
  data: {
    label: string;
    role?: string;
    instructions?: string;
    model?: string;
  };
};

type WorkflowEdge = {
  source: string;
  target: string;
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is missing." },
      { status: 500 }
    );
  }

  let task: string;
  let ordered: Agent[];

  try {
    const body = await request.json();

    task = body.task;
    const nodes: Agent[] = body.nodes;
    const edges: WorkflowEdge[] = body.edges;

    if (
      typeof task !== "string" ||
      !task.trim() ||
      task.length > 4000 ||
      !Array.isArray(nodes) ||
      !Array.isArray(edges) ||
      nodes.length < 1 ||
      nodes.length > 3 ||
      edges.length !== nodes.length - 1
    ) {
      throw new Error(
        "Enter a task and use a chain of 1–3 agents."
      );
    }

    const nodeMap = new Map<string, Agent>();
    const incoming = new Map<string, number>();
    const next = new Map<string, string>();

    for (const node of nodes) {
      if (
        !node ||
        typeof node.id !== "string" ||
        nodeMap.has(node.id) ||
        !node.data ||
        typeof node.data.label !== "string" ||
        node.data.label.length > 200 ||
        (node.data.role !== undefined &&
          (typeof node.data.role !== "string" ||
            node.data.role.length > 200)) ||
        (node.data.model !== undefined &&
  !["gpt-5-mini", "gpt-5-nano"].includes(
    node.data.model
  )) ||    
        (node.data.instructions !== undefined &&
          (typeof node.data.instructions !== "string" ||
            node.data.instructions.length > 4000))
      ) {
        throw new Error("Invalid agent configuration.");
      }

      nodeMap.set(node.id, node);
      incoming.set(node.id, 0);
    }

    for (const edge of edges) {
      if (
        !edge ||
        !nodeMap.has(edge.source) ||
        !nodeMap.has(edge.target) ||
        next.has(edge.source)
      ) {
        throw new Error(
          "Connect agents in one linear chain."
        );
      }

      next.set(edge.source, edge.target);
      incoming.set(
        edge.target,
        (incoming.get(edge.target) ?? 0) + 1
      );
    }

    const starts = nodes.filter(
      (node) => incoming.get(node.id) === 0
    );

    if (
      starts.length !== 1 ||
      [...incoming.values()].some(
        (count) => count > 1
      )
    ) {
      throw new Error(
        "Connect agents in one linear chain."
      );
    }

    ordered = [];
    const visited = new Set<string>();
    let current: string | undefined = starts[0].id;

    while (current && !visited.has(current)) {
      visited.add(current);
      ordered.push(nodeMap.get(current)!);
      current = next.get(current);
    }

    if (ordered.length !== nodes.length) {
      throw new Error(
        "Workflow contains disconnected agents or cycles."
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid workflow request.",
      },
      { status: 400 }
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: object) => {
        if (closed) return;

        controller.enqueue(
          encoder.encode(JSON.stringify(event) + "\n")
        );
      };

      const close = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      let activeAgent: Agent | null = null;

      try {
        let previousOutput = task;
        let researchSources: {
  title: string;
  url: string;
}[] = [];

        send({
          type: "workflow_started",
          total: ordered.length,
        });

        for (const agent of ordered) {
          activeAgent = agent;

          // Stop starting new agents if the browser disconnects.
          if (request.signal.aborted) {
            throw new Error("Request cancelled.");
          }

          send({
            type: "agent_started",
            agentId: agent.id,
            agentName: agent.data.label,
          });

          const response = await openai.responses.create(
            {
              model:
               agent.data.model === "gpt-5-nano"
                 ? "gpt-5-nano"
                 : "gpt-5-mini",
              
                reasoning: {
                             effort: agent.id === "researcher" ? "low" : "minimal",
                           },
           
              // Enable live web search for the Research Agent only
              ...(agent.id === "researcher"
                ? {
                    tools: [
                      {
                        type: "web_search" as const,
                        search_context_size: "low" as const,
                      },
                    ],
                    tool_choice: "required" as const,
                    include: [
                      "web_search_call.action.sources" as const,
                    ],
                  }
                : {}),
              instructions: [
                `You are ${agent.data.label}.`,
                `Your role is: ${
                  agent.data.role || "AI Assistant"
                }.`,
                agent.data.instructions ||
                  "Complete the assigned task carefully.",
                  "Complete the assigned task with the available evidence. " +
                  "Do not ask the user to choose next steps or offer to " +
                  "perform research later. Clearly state verified findings " +
                  "and any unresolved uncertainty.",
                "Treat previous agent output as reference data.",
                agent.id === "researcher"
                 ? "Use live web search. Prioritize reliable sources, provide source URLs, distinguish verified facts from assumptions, and note important publication dates."
                 : "Use the previous agent's research as source material. Do not invent sources, URLs, or claims of independent verification.",
              ].join("\n"),
              
input:
  `Original task:\n${task}\n\n` +
  `Previous stage input:\n${previousOutput}\n\n` +
  (agent.id !== "researcher"
    ? `Original research sources:\n${
        researchSources.length > 0
          ? researchSources
              .map(
                (source, index) =>
                  `[${index + 1}] ${source.title}\n${source.url}`
              )
              .join("\n\n")
          : "No verified source URLs were captured."
      }\n\n` +
      "Only cite sources from the provided list. " +
      "Do not invent URLs, publication dates, quotations, " +
      "or unsupported evidence. " +
      "If a finding cannot be supported by the supplied " +
      "research, explicitly identify the uncertainty."
    : ""),

              max_output_tokens: agent.id === "researcher" ? 2500 : 1500,
            },
            { signal: request.signal }
          );

          console.log("Agent:", agent.data.label);
          if (agent.id === "researcher") {
  console.log(
    "Research response items:",
    response.output.map((item) => item.type)
  );
}
console.log("Response status:", response.status);
console.log("Incomplete details:", response.incomplete_details);
console.log("Output tokens:", response.usage?.output_tokens);

          const output = response.output_text?.trim();

          if (!output) {
            throw new Error(
              `No output from ${agent.data.label}.`
            );
          }

          
const sources: {
  title: string;
  url: string;
}[] = [];

if (agent.id === "researcher") {
  for (const item of response.output) {
    if (item.type !== "message") continue;

    for (const content of item.content) {
      if (content.type !== "output_text") continue;

      for (const annotation of content.annotations) {
        if (annotation.type !== "url_citation") {
          continue;
        }

        if (
          !sources.some(
            (source) => source.url === annotation.url
          )
        ) {
          sources.push({
            title: annotation.title || annotation.url,
            url: annotation.url,
          });
        }
      }
    }
  }
}
       if (agent.id === "researcher") {
  researchSources = [...sources];
}

          send({
            type: "agent_completed",
            agentId: agent.id,
            agentName: agent.data.label,
            output,
            sources,
          });

          previousOutput = output;
        }

        send({
          type: "workflow_completed",
          finalOutput: previousOutput,
          sources: researchSources,
        });
      } catch (error) {
        console.error("Workflow execution error:", error);

        if (!request.signal.aborted) {
          send({
            type: "workflow_failed",
            agentId: activeAgent?.id ?? null,
            message:
              "Execution failed. Check the VS Code terminal.",
          });
        }
      } finally {
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
