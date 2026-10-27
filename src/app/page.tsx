
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
const features = [
  {
    number: "01",
    title: "Visual Workflow Builder",
    description:
      "Design intelligent workflows by connecting multiple AI agents using a visual canvas.",
  },
  {
    number: "02",
    title: "AI Execution Engine",
    description:
      "Execute workflows and coordinate AI agents to complete complex tasks.",
  },
  {
    number: "03",
    title: "Execution Debugger",
    description:
      "Inspect agent inputs, outputs, execution times, and errors in one place.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <div className="text-2xl font-bold">
            <span className="text-violet-400">◆</span> AgentForge
          </div>

          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            Version 0.1
          </span>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-24 text-center">

        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-violet-400">
          AI Agent Orchestration Platform
        </p>

        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
          Build intelligent workflows.
          <span className="mt-3 block text-violet-400">
            Understand every step.
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-slate-400">
          AgentForge helps you design, execute, and debug
          multi-agent AI workflows through a powerful
          visual development experience.
        </p>

        <div className="mt-10">
          <span className="inline-block rounded-lg bg-violet-600 px-6 py-3 font-semibold">
            Workflow Studio Coming Soon
          </span>
        </div>

      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">

        {features.map((feature) => (
          <div
            key={feature.number}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-7"
          >

            <p className="mb-6 text-sm font-semibold text-violet-400">
              {feature.number}
            </p>

            <h2 className="mb-3 text-xl font-semibold">
              {feature.title}
            </h2>

            <p className="text-sm leading-7 text-slate-400">
              {feature.description}
            </p>

          </div>
        ))}

      </section>
      
{/* Workflow Studio */}
<section className="mx-auto max-w-6xl px-6 py-16">
  <div className="mb-6">
    <h2 className="text-3xl font-bold">
      Workflow Studio
    </h2>

    <p className="mt-3 text-slate-400">
      Design AI workflows by connecting intelligent agents.
    </p>
  </div>

  <WorkflowCanvas />

  <p className="mt-4 text-sm text-slate-500">
    Drag nodes to move them. Use their handles to
    create connections.
  </p>
</section>


      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-500">
        AgentForge — Built by Kulvir Bhullar
      </footer>

    </main>
  );
}
