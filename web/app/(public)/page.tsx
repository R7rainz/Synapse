import Link from "next/link";

const flow = [
  ["01", "Authenticate", "Verify the gateway key and resolve its owner."],
  ["02", "Forward", "Send the OpenAI-compatible request to the configured provider."],
  ["03", "Generate", "The upstream provider runs the model and returns the response."],
  ["04", "Observe", "Record request status and latency without storing its contents."],
];

const capabilities = [
  ["Application keys", "Give each application a revocable gateway credential without exposing provider secrets."],
  ["Provider boundary", "Keep one OpenAI-compatible route between applications and your configured upstream."],
  ["Request visibility", "Inspect status and latency metadata while prompts and responses stay out of the dashboard."],
];

export default function Home() {
  return (
    <div className="animate-page-in">
      <section className="surface-grid border-b border-line">
        <div className="mx-auto grid min-h-[calc(100svh-64px)] w-full max-w-[1440px] grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)] items-stretch max-lg:grid-cols-1">
          <div className="flex flex-col justify-center px-[clamp(1.5rem,6vw,6.5rem)] py-24 max-sm:py-16">
            <p className="mb-6 font-mono text-xs tracking-[0.14em] text-brand uppercase">LLM gateway infrastructure</p>
            <h1 className="m-0 max-w-5xl text-[clamp(3.4rem,7.4vw,7.8rem)] leading-[0.88] font-semibold tracking-[-0.065em] text-ink">
              One route into your model stack.
            </h1>
            <p className="mt-8 mb-0 max-w-2xl text-[clamp(1rem,1.6vw,1.2rem)] leading-8 text-muted">
              Applications call Synapse with a gateway key. Synapse authenticates, forwards to your configured upstream provider, and records operational metadata. The provider generates the response.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-12 items-center border border-brand bg-brand px-5 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light" href="/sign-up">
                Create account
              </Link>
              <Link className="inline-flex min-h-12 items-center border border-line-strong px-5 text-sm font-semibold text-soft transition-colors hover:border-soft hover:text-ink" href="/dashboard">
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center border-l border-line bg-surface/65 px-8 py-20 max-lg:border-t max-lg:border-l-0 max-sm:px-4">
            <div className="mb-8 flex items-center justify-between font-mono text-[0.68rem] text-muted">
              <span>REQUEST FLOW</span>
              <span className="text-positive">● ready</span>
            </div>
            <div className="border-y border-line">
              {flow.map(([step, title, description]) => (
                <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-b border-line py-5 last:border-b-0" key={step}>
                  <span className="font-mono text-xs text-brand">{step}</span>
                  <div>
                    <h2 className="m-0 text-base font-semibold text-ink">{title}</h2>
                    <p className="mt-1.5 mb-0 text-sm leading-6 text-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 max-sm:px-4 max-sm:py-16">
          <div className="mb-14 grid grid-cols-[minmax(0,0.8fr)_minmax(320px,1.2fr)] gap-12 max-md:grid-cols-1 max-md:gap-5">
            <p className="m-0 font-mono text-xs tracking-[0.14em] text-brand uppercase">A smaller operational surface</p>
            <h2 className="m-0 max-w-3xl text-[clamp(2.2rem,4.6vw,4.8rem)] leading-[0.98] font-semibold tracking-[-0.05em]">
              Your application talks to Synapse. Synapse talks to the configured provider.
            </h2>
          </div>

          <div className="grid grid-cols-3 border-y border-line max-md:grid-cols-1">
            {capabilities.map(([title, description], index) => (
              <article className={`min-h-56 px-7 py-8 max-md:min-h-0 max-md:border-b max-md:border-line max-md:px-0 ${index > 0 ? "border-l border-line max-md:border-l-0" : ""}`} key={title}>
                <span className="font-mono text-xs text-muted">0{index + 1}</span>
                <h3 className="mt-12 mb-3 text-xl font-semibold max-md:mt-6">{title}</h3>
                <p className="m-0 max-w-sm text-sm leading-7 text-muted">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="dot-field border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1440px] items-end justify-between gap-10 px-6 py-24 max-md:flex-col max-md:items-start max-sm:px-4 max-sm:py-16">
          <div>
            <p className="mb-5 font-mono text-xs tracking-[0.14em] text-brand uppercase">Start with one workspace</p>
            <h2 className="m-0 max-w-3xl text-[clamp(2.5rem,5vw,5.4rem)] leading-[0.94] font-semibold tracking-[-0.055em]">Keep provider credentials behind one gateway.</h2>
          </div>
          <Link className="inline-flex min-h-12 shrink-0 items-center border border-brand bg-brand px-5 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light" href="/sign-up">
            Create account
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex min-h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-6 font-mono text-[0.68rem] text-muted max-sm:px-4">
        <span>Synapse</span>
        <span>authenticate · forward · observe</span>
      </footer>
    </div>
  );
}
