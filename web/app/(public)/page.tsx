import Link from "next/link";

const flow = [
  ["01", "Authenticate", "Verify the gateway key and resolve its owner."],
  ["02", "Forward", "Send the OpenAI-compatible request to the configured provider."],
  ["03", "Generate", "The upstream provider runs the model and returns the response."],
  ["04", "Observe", "Record request status and latency without storing its contents."],
] as const;

const capabilities = [
  ["Application keys", "Give each application a revocable gateway credential without exposing provider secrets.", "ACCESS"],
  ["Provider boundary", "Keep one OpenAI-compatible route between applications and your configured upstream.", "ROUTE"],
  ["Request visibility", "Inspect status and latency metadata while prompts and responses stay out of the dashboard.", "SIGNAL"],
] as const;

export default function Home() {
  return (
    <div className="animate-page-in bg-paper text-ink-dark">
      <section className="border-b border-hairline">
        <div className="mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1440px] grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] items-center gap-12 px-6 py-20 max-lg:grid-cols-1 max-lg:gap-8 max-sm:px-4 max-sm:py-14">
          <div className="max-w-3xl">
            <p className="eyebrow mb-6 text-deep-green">LLM gateway infrastructure</p>
            <h1 className="display-title m-0 max-w-4xl text-[clamp(3.7rem,8vw,8.4rem)] leading-[0.88]">One route into your model stack.</h1>
            <p className="public-copy mt-8 mb-0 max-w-2xl text-[clamp(1rem,1.5vw,1.2rem)]">
              Applications call Synapse with a gateway key. Synapse authenticates, forwards to your configured upstream provider, and records operational metadata while the provider generates the response.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link className="button-primary" href="/sign-up">Create account</Link>
              <Link className="button-secondary" href="/dashboard">Open dashboard <span className="ml-2" aria-hidden="true">↗</span></Link>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="card-lift route-visual rounded-[22px] border border-deep-green bg-deep-green p-5 text-white">
              <div className="flex items-center justify-between font-mono text-[0.68rem] uppercase tracking-[0.12em] text-white/65">
                <span>Gateway route</span>
                <span className="status-pill text-positive">Ready</span>
              </div>
              <div className="route-visual-map mt-8" role="img" aria-label="Request path from application through Synapse to upstream provider">
                <div className="route-node">
                  <span className="route-node-marker">01</span>
                  <strong>Application</strong>
                  <small>Gateway key</small>
                </div>
                <div className="route-rail"><span className="route-packet" /></div>
                <div className="route-node route-node-accent">
                  <span className="route-node-marker">02</span>
                  <strong>Synapse</strong>
                  <small>Authenticate + forward</small>
                </div>
                <div className="route-rail"><span className="route-packet route-packet-delay" /></div>
                <div className="route-node">
                  <span className="route-node-marker">03</span>
                  <strong>Upstream</strong>
                  <small>Model response</small>
                </div>
              </div>
              <div className="mt-8 border-t border-white/15 pt-4">
                <p className="m-0 max-w-sm text-2xl leading-tight">Keep the model boundary visible, inspectable, and yours.</p>
              </div>
            </div>

            <div className="card-lift rounded-2xl border border-hairline bg-stone p-6">
              <div className="mb-5 flex items-center justify-between font-mono text-[0.68rem] uppercase tracking-[0.12em] text-body-dark">
                <span>Request flow</span>
                <span className="text-deep-green">04 stages</span>
              </div>
              <div className="section-rule">
                {flow.map(([step, title, description]) => (
                  <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-hairline py-4 last:border-b-0" key={step}>
                    <span className="font-mono text-xs text-coral">{step}</span>
                    <div>
                      <h2 className="m-0 text-base font-semibold">{title}</h2>
                      <p className="mt-1 mb-0 text-xs leading-5 text-body-dark">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline" id="boundary">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,0.75fr)_minmax(320px,1.25fr)] gap-12 px-6 py-28 max-md:grid-cols-1 max-md:gap-6 max-sm:px-4 max-sm:py-20">
          <p className="eyebrow m-0 text-coral">The operational boundary</p>
          <div>
            <h2 className="display-title m-0 max-w-4xl text-[clamp(2.6rem,5.2vw,5.4rem)] leading-[0.94]">Your application talks to Synapse. Synapse talks to the configured provider.</h2>
            <p className="public-copy mt-7 mb-0 max-w-2xl">A smaller surface between application code and model providers gives teams a place to authenticate, govern, and understand what happened.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-white" id="capabilities">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 max-sm:px-4 max-sm:py-16">
          <div className="mb-12 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start">
            <div>
              <p className="eyebrow mb-4 text-deep-green">Designed for model operations</p>
              <h2 className="display-title m-0 text-[clamp(2.5rem,4.6vw,4.8rem)] leading-none">The useful parts stay close.</h2>
            </div>
            <span className="status-pill text-deep-green">No prompt storage</span>
          </div>

          <div className="grid grid-cols-3 border-y border-hairline max-md:grid-cols-1">
            {capabilities.map(([title, description, marker], index) => (
              <article className={`min-h-64 px-7 py-8 transition-colors hover:bg-stone/45 max-md:min-h-0 max-md:px-0 max-md:py-7 ${index > 0 ? "border-l border-hairline max-md:border-l-0 max-md:border-t" : ""}`} key={title}>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs text-coral">0{index + 1}</span>
                  <span className="font-mono text-[0.62rem] tracking-[0.12em] text-body-dark">{marker}</span>
                </div>
                <h3 className="mt-14 mb-3 text-2xl font-normal tracking-[-0.02em] max-md:mt-8">{title}</h3>
                <p className="m-0 max-w-sm text-sm leading-7 text-body-dark">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-deep-green text-white" id="how-it-works">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[minmax(0,0.8fr)_minmax(320px,1.2fr)] gap-16 px-6 py-28 max-md:grid-cols-1 max-md:gap-10 max-sm:px-4 max-sm:py-20">
          <div>
            <p className="eyebrow mb-5 text-coral-soft">How it works</p>
            <h2 className="display-title m-0 max-w-2xl text-[clamp(2.8rem,5.3vw,5.6rem)] leading-[0.92]">From application request to useful response.</h2>
            <p className="mt-7 mb-0 max-w-lg text-base leading-7 text-white/70">The gateway does the boundary work and leaves the provider responsible for model generation.</p>
          </div>
          <div className="border-y border-white/20">
            {flow.map(([step, title, description]) => (
              <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-5 border-b border-white/20 py-6 last:border-b-0" key={step}>
                <span className="font-mono text-sm text-coral-soft">{step}</span>
                <div>
                  <h3 className="m-0 text-xl font-normal">{title}</h3>
                  <p className="mt-2 mb-0 max-w-lg text-sm leading-6 text-white/65">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone" id="start">
        <div className="mx-auto flex w-full max-w-[1440px] items-end justify-between gap-10 px-6 py-24 max-md:flex-col max-md:items-start max-sm:px-4 max-sm:py-16">
          <div>
            <p className="eyebrow mb-5 text-deep-green">Start with one workspace</p>
            <h2 className="display-title m-0 max-w-3xl text-[clamp(2.8rem,5.2vw,5.6rem)] leading-[0.92]">Keep provider credentials behind one gateway.</h2>
          </div>
          <Link className="button-primary shrink-0" href="/sign-up">Create account <span className="ml-2" aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <footer className="mx-auto flex min-h-24 w-full max-w-[1440px] items-center justify-between gap-4 px-6 font-mono text-[0.68rem] text-body-dark max-sm:px-4">
        <span>Synapse</span>
        <span>authenticate · forward · observe</span>
      </footer>
    </div>
  );
}
