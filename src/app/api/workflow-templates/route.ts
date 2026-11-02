
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/check-origin";


export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("workflow_templates")
      .select("id, name, nodes, edges, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query failed:", error.message);

      return NextResponse.json(
        { error: "Unable to load workflow templates." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { templates: data ?? [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Cloud templates error:", error);

    return NextResponse.json(
      { error: "Unable to connect to cloud storage." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Reject cross-origin browser requests
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    // Limit the size of incoming template data
    const rawBody = await request.text();

    if (rawBody.length > 50000) {
      return NextResponse.json(
        { error: "Template is too large." },
        { status: 413 }
      );
    }

    const body = JSON.parse(rawBody);
    const { name, nodes, edges } = body;

    // Validate the template name and agent data
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 200 ||
      !Array.isArray(nodes) ||
      !Array.isArray(edges) ||
      nodes.length < 1 ||
      nodes.length > 3 ||
      edges.length !== nodes.length - 1
    ) {
      return NextResponse.json(
        { error: "Invalid workflow template." },
        { status: 400 }
      );
    }

    const nodeIds = new Set<string>();

    for (const node of nodes) {
      if (
        !node ||
        typeof node.id !== "string" ||
        !node.id ||
        nodeIds.has(node.id) ||
        !node.data ||
        typeof node.data.label !== "string" ||
        node.data.label.length > 200 ||
        (node.data.role !== undefined &&
          (typeof node.data.role !== "string" ||
            node.data.role.length > 200)) ||
        (node.data.instructions !== undefined &&
          (typeof node.data.instructions !== "string" ||
            node.data.instructions.length > 4000)) ||
        (node.data.model !== undefined &&
          !["gpt-5-mini", "gpt-5-nano"].includes(node.data.model))
      ) {
        return NextResponse.json(
          { error: "Invalid agent configuration." },
          { status: 400 }
        );
      }

      nodeIds.add(node.id);
    }

    // Check that the connections form a single chain
    const incoming = new Map<string, number>();
    const next = new Map<string, string>();

    for (const id of nodeIds) {
      incoming.set(id, 0);
    }

    for (const edge of edges) {
      if (
        !edge ||
        !nodeIds.has(edge.source) ||
        !nodeIds.has(edge.target) ||
        edge.source === edge.target ||
        next.has(edge.source)
      ) {
        return NextResponse.json(
          { error: "Invalid agent connections." },
          { status: 400 }
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

    const visited = new Set<string>();
    let current: string | undefined =
      starts.length === 1 ? starts[0].id : undefined;

    while (current && !visited.has(current)) {
      visited.add(current);
      current = next.get(current);
    }

    if (
      starts.length !== 1 ||
      visited.size !== nodes.length ||
      current !== undefined
    ) {
      return NextResponse.json(
        { error: "Agents must form one connected chain." },
        { status: 400 }
      );
    }

    // Save the validated template to Supabase
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("workflow_templates")
      .insert({
        name: name.trim(),
        nodes,
        edges,
      })
      .select("id, name, nodes, edges, created_at, updated_at")
      .single();

    if (error) {
      console.error("Template save failed:", error.message);

      return NextResponse.json(
        { error: "Unable to save template." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { template: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Template request failed:", error);

    return NextResponse.json(
      { error: "Unable to process template request." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  // Check the request origin before deleting data
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Request origin is not allowed." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const id = body?.id;

    // Validate the template ID
    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { error: "Invalid template ID." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Delete only the matching template
    const { data, error } = await supabase
      .from("workflow_templates")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Template deletion failed:", error.message);

      return NextResponse.json(
        { error: "Unable to delete template." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Template not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: data.id,
    });
  } catch (error) {
    console.error("Delete template request failed:", error);

    return NextResponse.json(
      { error: "Unable to process delete request." },
      { status: 400 }
    );
  }
}
