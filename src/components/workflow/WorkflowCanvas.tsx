
"use client";

import { useCallback, useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";

// ---------------------------
// Initial AI agents
// ---------------------------

const initialNodes: Node[] = [
  {
    id: "researcher",
    position: { x: 250, y: 50 },
    data: {
      label: "🔍 Research Agent",
      role: "Research Specialist",
      model: "gpt-5-mini",
      instructions:
        "Research the given topic and provide accurate, structured findings.",
    },
    style: {
      background: "#31264F",
      color: "#FFFFFF",
      border: "1px solid #8B5CF6",
      borderRadius: "12px",
      padding: "15px",
      width: 200,
      fontWeight: 600,
      textAlign: "center",
    },
  },
  {
    id: "analyst",
    position: { x: 250, y: 200 },
    data: {
      label: "📊 Analyst Agent",
      role: "Data Analyst",
      model: "gpt-5-mini",
      instructions:
        "Analyse the research findings and identify key insights.",
    },
    style: {
      background: "#143B3A",
      color: "#FFFFFF",
      border: "1px solid #14B8A6",
      borderRadius: "12px",
      padding: "15px",
      width: 200,
      fontWeight: 600,
      textAlign: "center",
    },
  },
  {
    id: "writer",
    position: { x: 250, y: 350 },
    data: {
      label: "✍️ Writer Agent",
      role: "Content Writer",
      model: "gpt-5-nano",
      instructions:
        "Turn the analysed information into clear, professional content.",
    },
    style: {
      background: "#3B3020",
      color: "#FFFFFF",
      border: "1px solid #F59E0B",
      borderRadius: "12px",
      padding: "15px",
      width: 200,
      fontWeight: 600,
      textAlign: "center",
    },
  },
];

// ---------------------------
// Initial connections
// ---------------------------

const initialEdges: Edge[] = [
  {
    id: "researcher-analyst",
    source: "researcher",
    target: "analyst",
    animated: true,
  },
  {
    id: "analyst-writer",
    source: "analyst",
    target: "writer",
    animated: true,
  },
];

type AgentResult = {
  agentId: string;
  agentName: string;
  output: string;
  sources?: {
    title: string;
    url: string;
  }[];
};

export default function WorkflowCanvas() {
  // ---------------------------
  // React Flow state
  // ---------------------------

  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [selectedAgentId, setSelectedAgentId] =
    useState<string | null>(null);

  const selectedAgent = nodes.find(
    (node) => node.id === selectedAgentId
  );

  // ---------------------------
  // AI workflow execution state
  // ---------------------------

  const [workflowTask, setWorkflowTask] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [workflowResults, setWorkflowResults] =
    useState<AgentResult[]>([]);
  const [finalSources, setFinalSources] = useState<
  { title: string; url: string }[]
>([]);
  const [runError, setRunError] = useState("");
  const [hasRun, setHasRun] = useState(false);

  type AgentStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed";

const [agentStatuses, setAgentStatuses] = useState<
  Record<string, AgentStatus>
>({});

  // ---------------------------
  // Update selected agent
  // ---------------------------

  const updateAgent = (
    field: "label" | "role" | "instructions" | "model",
    value: string
  ) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedAgentId
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            }
          : node
      )
    );
  };

  // ---------------------------
  // Add new agent
  // ---------------------------

  const addAgent = () => {
    const id = crypto.randomUUID();

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type: "default",
        position: {
          x: 200 + currentNodes.length * 40,
          y: 150 + currentNodes.length * 40,
        },
        data: {
          label: `🤖 New Agent ${currentNodes.length + 1}`,
          role: "AI Assistant",
          model: "gpt-5-mini",
          instructions:
            "Complete the assigned task carefully.",
        },
        style: {
          background: "#1e293b",
          color: "#ffffff",
          border: "1px solid #6366f1",
          borderRadius: "12px",
          padding: "12px",
          width: 190,
        },
      },
    ]);
  };

  // ---------------------------
  // Connect agents
  // ---------------------------

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(connection, currentEdges)
      );
    },
    [setEdges]
  );

  // ---------------------------
  // Save workflow
  // ---------------------------

  const saveWorkflow = () => {
    try {
      localStorage.setItem(
        "agentforge-workflow",
        JSON.stringify({ nodes, edges })
      );

      alert("Workflow saved successfully!");
    } catch {
      alert("Unable to save workflow.");
    }
  };

  // ---------------------------
  // Load workflow
  // ---------------------------

  const loadWorkflow = () => {
    const savedWorkflow = localStorage.getItem(
      "agentforge-workflow"
    );

    if (!savedWorkflow) {
      alert("No saved workflow found.");
      return;
    }

    try {
      const workflow = JSON.parse(savedWorkflow);

      if (
        !Array.isArray(workflow.nodes) ||
        !Array.isArray(workflow.edges)
      ) {
        throw new Error("Invalid workflow data");
      }

      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setSelectedAgentId(null);
      setWorkflowResults([]);
      setFinalSources([]);
      setHasRun(false);
      setRunError("");

      alert("Workflow loaded successfully!");
    } catch {
      alert("Could not load the saved workflow.");
    }
  };

  // ---------------------------
  // Run AI workflow
  // ---------------------------

  
const runWorkflow = async () => {
  if (isRunning) return;

  if (!workflowTask.trim()) {
    setRunError("Please enter a task first.");
    return;
  }

  if (nodes.length > 3) {
    setRunError(
      "This version supports a maximum of 3 agents."
    );
    return;
  }

  setIsRunning(true);
  setRunError("");
  setHasRun(false);
  setWorkflowResults([]);

  // All agents start in the waiting state.
  const initialStatuses: Record<
    string,
    "waiting" | "running" | "completed" | "failed"
  > = {};

  nodes.forEach((node) => {
    initialStatuses[node.id] = "waiting";
  });

  setAgentStatuses(initialStatuses);

  try {
    const response = await fetch("/api/run-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: workflowTask,
        nodes,
        edges,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));

      throw new Error(
        data.error || `Server error: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error("Server did not return a stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completedSuccessfully = false;

    const handleEvent = (event: {
      type: string;
      agentId?: string | null;
      agentName?: string;
      output?: string;
      message?: string;
      sources?: {
  title: string;
  url: string;
}[];
    }) => {
      if (event.type === "agent_started" && event.agentId) {
        const id = event.agentId;

        setAgentStatuses((current) => ({
          ...current,
          [id]: "running",
        }));
      }

      if (
        event.type === "agent_completed" &&
        event.agentId
      ) {
        const id = event.agentId;

        setAgentStatuses((current) => ({
          ...current,
          [id]: "completed",
        }));

        setWorkflowResults((current) => [
          ...current,
          {
            agentId: id,
            agentName: event.agentName || "AI Agent",
            output: event.output || "",
            sources: event.sources || [],
          },
        ]);
      }

      if (event.type === "workflow_failed") {
        if (event.agentId) {
          const id = event.agentId;

          setAgentStatuses((current) => ({
            ...current,
            [id]: "failed",
          }));
        }

        throw new Error(
          event.message || "Workflow execution failed."
        );
      }

if (event.type === "workflow_completed") {
  completedSuccessfully = true;
  setFinalSources(event.sources || []);
  setHasRun(true);
}
    };

    // Parse each newline-delimited progress event.
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const event = JSON.parse(line);
        handleEvent(event);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      handleEvent(JSON.parse(buffer));
    }

    if (!completedSuccessfully) {
      throw new Error(
        "The workflow stream ended before completion."
      );
    }
  } catch (error) {
    setRunError(
      error instanceof Error
        ? error.message
        : "Something went wrong."
    );
  } finally {
    setIsRunning(false);
  }
};


  // ---------------------------
  // User interface
  // ---------------------------

  return (
    <div className="w-full rounded-xl border border-slate-700 p-4">

      {/* Workflow toolbar */}

      <div className="mb-4 flex flex-wrap gap-3">
        <button
          onClick={addAgent}
          disabled={isRunning}
          className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          + Add Agent
        </button>

        <button
          onClick={saveWorkflow}
          disabled={isRunning}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          💾 Save Workflow
        </button>

        <button
          onClick={loadWorkflow}
          disabled={isRunning}
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          📂 Load Workflow
        </button>
      </div>

      {/* Task input */}

      <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-3 text-lg font-bold text-white">
          🚀 AI Workflow Runner
        </h3>

        <label
          htmlFor="workflow-task"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          What should your AI agents do?
        </label>

        <textarea
          id="workflow-task"
          value={workflowTask}
          onChange={(e) =>
            setWorkflowTask(e.target.value)
          }
          placeholder="Example: Explain the benefits of AI in business."
          rows={3}
          maxLength={4000}
          disabled={isRunning}
          className="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white placeholder-slate-500 disabled:opacity-50"
        />

        <button
          onClick={runWorkflow}
          disabled={isRunning || !workflowTask.trim()}
          className="mt-3 rounded-lg bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning
            ? "⏳ Running AI Agents..."
            : "▶ Run Workflow"}
        </button>

        <p
          aria-live="polite"
          className="mt-3 text-sm text-slate-400"
        >
          {isRunning
            ? "Processing your workflow. Please keep this page open."
            : "Each run uses OpenAI API credits."}
        </p>

        {runError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-700 bg-red-950 p-3 text-red-300"
          >
            {runError}
          </div>
        )}
      </div>

      
{/* Live agent execution tracker */}

{Object.keys(agentStatuses).length > 0 && (
  <div
    aria-live="polite"
    className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-5 text-white"
  >
    <h3 className="mb-4 text-lg font-bold">
      📡 Live Agent Execution
    </h3>

    <div className="mb-3 flex justify-between text-sm text-slate-300">
      <span>Workflow Progress</span>

      <span>
        {
          Object.values(agentStatuses).filter(
            (status) => status === "completed"
          ).length
        }
        {" / "}
        {nodes.length} agents completed
      </span>
    </div>

    <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-700">
      <div
        className="h-full rounded-full bg-violet-500 transition-all duration-500"
        style={{
          width: `${
            (Object.values(agentStatuses).filter(
              (status) => status === "completed"
            ).length /
              Math.max(nodes.length, 1)) *
            100
          }%`,
        }}
      />
    </div>

    <div className="space-y-3">
      {nodes.map((node) => {
        const status =
          agentStatuses[node.id] || "waiting";

        return (
          <div
            key={node.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 p-4"
          >
            <span className="font-medium">
              {String(node.data.label ?? "AI Agent")}
            </span>

            {status === "waiting" && (
              <span className="text-slate-400">
                ◷ Waiting
              </span>
            )}

            {status === "running" && (
              <span className="animate-pulse text-blue-400">
                ● Running...
              </span>
            )}

            {status === "completed" && (
              <span className="text-emerald-400">
                ✓ Completed
              </span>
            )}

            {status === "failed" && (
              <span className="text-red-400">
                ✕ Failed
              </span>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}


      {/* Workflow canvas */}

      <div className="h-[500px] w-full overflow-hidden rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) =>
            setSelectedAgentId(node.id)
          }
          colorMode="dark"
          fitView
          nodesDraggable={!isRunning}
          nodesConnectable={!isRunning}
          elementsSelectable={!isRunning}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />

          <Controls />

          <MiniMap />
        </ReactFlow>
      </div>

      {/* Agent configuration */}

      {selectedAgent && (
        <div className="mt-5 rounded-xl border border-violet-500 bg-slate-800 p-5 text-white">

          <h3 className="mb-4 text-lg font-bold">
            ⚙️ Agent Configuration
          </h3>

          <label className="mb-1 block">
            Agent Name
          </label>

          <input
            value={String(
              selectedAgent.data.label ?? ""
            )}
            onChange={(e) =>
              updateAgent("label", e.target.value)
            }
            disabled={isRunning}
            className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white"
          />

          
{/* AI Model Selection */}

<label className="mb-1 block">
  AI Model
</label>

<select
  value={String(
    selectedAgent.data.model ?? "gpt-5-mini"
  )}
  onChange={(e) =>
    updateAgent("model", e.target.value)
  }
  disabled={isRunning}
  className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white"
>
  <option value="gpt-5-mini">
    GPT-5 Mini — Balanced
  </option>

  <option value="gpt-5-nano">
    GPT-5 Nano — Economical
  </option>
</select>


          <textarea
            value={String(
              selectedAgent.data.instructions ?? ""
            )}
            onChange={(e) =>
              updateAgent("instructions", e.target.value)
            }
            disabled={isRunning}
            placeholder="Describe what this agent should do..."
            rows={5}
            className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white"
          />

          <button
            onClick={() => setSelectedAgentId(null)}
            className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white"
          >
            Close Settings
          </button>
        </div>
      )}

      {/* AI execution results */}

      {workflowResults.length > 0 && (
        <div className="mt-6 rounded-xl border border-emerald-700 bg-slate-900 p-5 text-white">

          <h2 className="mb-2 text-xl font-bold">
  {hasRun
    ? "✅ AI Workflow Completed"
    : isRunning
    ? "⏳ AI Workflow In Progress"
    : "⚠️ Partial Workflow Results"}
</h2>

          <p className="mb-5 text-sm text-slate-400">
            {workflowResults.length} agent(s)
            executed successfully.
          </p>

          <div className="space-y-4">
            {workflowResults.map((result, index) => (
              <div
                key={result.agentId}
                className="rounded-lg border border-slate-700 bg-slate-800 p-4"
              >
                <h3 className="mb-2 font-semibold text-violet-300">
                  Step {index + 1}: {result.agentName}
                </h3>

                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                  {result.output}
                </div>
                
{result.sources && result.sources.length > 0 && (
  <div className="mt-4 border-t border-slate-600 pt-4">
    <h4 className="mb-3 font-semibold text-emerald-400">
      🔗 Research Sources
    </h4>

    <div className="space-y-2">
      {result.sources.map((source, index) => (
        <a
          key={`${source.url}-${index}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-sm text-blue-400 underline hover:text-blue-300"
        >
          {index + 1}. {source.title}
        </a>
      ))}
    </div>
  </div>
)}

              </div>
            ))}
          </div>
{hasRun && (
  <button
            onClick={() => {
              const finalOutput =
                workflowResults[
                  workflowResults.length - 1
                ].output;

             const references = finalSources
              .map(
                (source, index) =>
                  `${index + 1}. ${source.title || source.url}\n${source.url}`
              )
              .join("\n\n");
            
            const completeReport =
              finalOutput +
              (references
                ? "\n\nRESEARCH REFERENCES\n\n" + references
                : "");
            
            navigator.clipboard
  .writeText(completeReport)
                .then(() =>
                  alert("Final output copied!")
                )
                .catch(() =>
                  alert("Unable to copy output.")
                );
            }}
            className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white"
          >
            📋 Copy Final Output
          </button>
)}

{hasRun && (
  <button
    onClick={() => {
      // Get the final agent's output
      const finalOutput =
        workflowResults[workflowResults.length - 1].output;

      // Build a list of research references
      const references = finalSources
        .map(
          (source, index) =>
            `${index + 1}. ${source.title || source.url}\n${source.url}`
        )
        .join("\n\n");

      // Combine the report and references
      const completeReport =
        finalOutput +
        (references
          ? "\n\n## Research References\n\n" + references
          : "");

      // Create a downloadable text file
      const file = new Blob([completeReport], {
        type: "text/markdown;charset=utf-8",
      });

      // Create a temporary download link
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");

      link.href = url;
      link.download = "agentforge-report.md";

      // Download the file
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary link
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }}
    className="ml-3 mt-5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white"
  >
    ⬇️ Download Report
  </button>
)}

{hasRun && (
  <button
    onClick={async () => {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF();

      const finalOutput =
        workflowResults[workflowResults.length - 1].output;

      const references = finalSources
        .map(
          (source, index) =>
            `${index + 1}. ${source.title || source.url}\n${source.url}`
        )
        .join("\n\n");

      const completeReport =
        finalOutput +
        (references
          ? "\n\nRESEARCH REFERENCES\n\n" + references
          : "");

     // const lines = pdf.splitTextToSize(completeReport, 170);

// Add the AgentForge report header
pdf.setFont("helvetica", "bold");
pdf.setFontSize(20);
pdf.text("AgentForge", 20, 20);

// Add the report subtitle
pdf.setFontSize(13);
pdf.text("AI Research Report", 20, 30);

// Add the report generation date
pdf.setFont("helvetica", "normal");
pdf.setFontSize(10);
pdf.text(
  `Generated: ${new Date().toLocaleDateString("en-AU")}`,
  20,
  39
);

// Add a horizontal divider
pdf.setDrawColor(150, 150, 150);
pdf.line(20, 44, 190, 44);

// Start the report below the header
let y = 55;

// Use normal text for the report body
pdf.setFontSize(11);

      // Split the report into individual lines
const reportLines = completeReport.split("\n");

for (const rawLine of reportLines) {
  // Remove Markdown heading symbols and extra spaces
  const line = rawLine.replace(/^#{1,6}\s+/, "").trim();

  // Identify Markdown headings and our references heading
  const isHeading =
    /^#{1,6}\s+/.test(rawLine) ||
    [
      "Executive Summary",
      "Key Findings",
      "Detailed Analysis",
      "Limitations and Uncertainties",
      "Conclusion",
      "Research References",
      "RESEARCH REFERENCES",
    ].includes(line);

  // Leave a smaller gap for blank lines
  if (!line) {
    y += 3;
    continue;
  }

  // Set font style
  if (isHeading) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    y += 4;
  } else {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
  }

  // Wrap long text within page margins
  const wrappedLines = pdf.splitTextToSize(line, 170);

  for (const wrappedLine of wrappedLines) {
    // Start a new page when needed
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }

    pdf.text(wrappedLine, 20, y);
    y += isHeading ? 8 : 6;
  }
}

pdf.save("agentforge-report.pdf");
    }}
    className="ml-3 mt-5 rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white"
  >
    📄 Download PDF
  </button>
)}
        
{/* Final research references */}

{hasRun && (
  <div className="mt-6 rounded-lg border border-slate-600 bg-slate-800 p-5">
    <h3 className="mb-3 text-lg font-bold text-emerald-400">
      📚 Final Research References
    </h3>
    <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
  ⚠️ Source verification reminder: A reference link does
  not automatically verify every claim in this report.
  Confirm important details such as product specifications,
  prices, dates, and availability directly with the source.
</p>

    {finalSources.length === 0 ? (
      <p className="text-sm text-amber-300">
        No source URLs were captured for this report.
        The findings should not be treated as verified research.
      </p>
    ) : (
      <>
        <p className="mb-4 text-sm text-slate-300">
          These are the original sources collected by the
          Research Agent. Review each source before relying
          on the report's conclusions.
        </p>

        <ol className="list-inside list-decimal space-y-3">
          {finalSources.map((source, index) => {
            const safeUrl =
              /^https?:\/\//i.test(source.url)
                ? source.url
                : null;

            if (!safeUrl) return null;

            return (
              <li key={`${source.url}-${index}`}>
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-sm text-blue-400 underline hover:text-blue-300"
                >
                  {source.title || source.url}
                </a>
              </li>
            );
          })}
        </ol>
      </>
    )}
  </div>
)}
  
        </div>
      )}
    </div>
  );
}
