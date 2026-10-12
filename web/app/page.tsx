import Link from "next/link";

const pipeline = [
  ["01", "identity.verify", "scoped key accepted", "4ms"],
  ["02", "context.retrieve", "5 document chunks attached", "31ms"],
  ["03", "provider.forward", "completion received", "842ms"],
];

export default function Home() {
  return (
    <div className="grid min-h-[calc(100svh-52px)] animate-page-in grid-rows-[1fr_auto] py-10 max-md:py-5">
      <section className="editor-grid my-auto overflow-hidden border border-line bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.28)]" aria-labelledby="synapse-title">
        <div className="flex h-9 items-center justify-between border-b border-line bg-raised px-3 font-mono text-[0.66rem] text-muted">
          <span>~/Projects/synapse</span>
          <span className="text-soft">README.md</span>
          <span>utf-8 · main</span>
        </div>

        <div className="grid min-h-[610px] grid-cols-[210px_minmax(0,1fr)] max-md:min-h-[680px] max-md:grid-cols-1">
          <aside className="border-r border-line bg-canvas/45 px-3 py-5 font-mono text-[0.68rem] text-muted max-md:hidden" aria-label="Project navigation">
            <p className="mb-4 text-[0.6rem] tracking-[0.16em] text-soft uppercase">Explorer</p>
            <ul className="m-0 grid list-none gap-1 p-0">
              <li className="text-soft">⌄ synapse/</li>
              <li className="bg-raised px-2 py-1.5 text-brand">│ README.md</li>
              <li className="px-2 py-1">├ auth/</li>
              <li className="px-2 py-1">├ gateway/</li>
              <li className="px-2 py-1">├ documents/</li>
              <li className="px-2 py-1">└ requests/</li>
            </ul>
            <div className="mt-12 border-t border-line pt-4">
              <p className="mb-2 text-[0.6rem] tracking-[0.16em] text-soft uppercase">Runtime</p>
              <p className="m-0 flex items-center gap-2 py-1"><span className="size-1.5 bg-positive" /> gateway online</p>
              <p className="m-0 flex items-center gap-2 py-1"><span className="size-1.5 bg-positive" /> database ready</p>
              <p className="m-0 flex items-center gap-2 py-1"><span className="size-1.5 bg-brand" /> provider idle</p>
            </div>
          </aside>

          <div className="relative flex min-w-0 flex-col">
            <div className="flex h-8 items-center border-b border-line px-4 font-mono text-[0.64rem] text-muted">
              <span className="text-brand">●</span><span className="ml-2">README.md</span><span className="ml-auto">gateway overview</span>
            </div>
            <div className="flex-1 overflow-hidden px-[clamp(1rem,5vw,4.5rem)] py-[clamp(2rem,7vh,5rem)]">
              <div className="grid grid-cols-[28px_minmax(0,1fr)] font-mono text-[0.68rem] leading-6">
                <span className="select-none text-right text-muted/45">01</span>
                <p className="m-0 pl-4 text-brand"># synapse gateway</p>
                <span className="select-none text-right text-muted/45">02</span><span />
                <span className="select-none text-right text-muted/45">03</span>
                <h1 className="m-0 max-w-3xl pl-4 font-sans text-[clamp(2.7rem,7vw,6.1rem)] leading-[0.92] font-semibold tracking-[-0.06em] text-ink" id="synapse-title">
                  Model traffic,<br /><span className="font-normal text-soft italic">routed with context.</span>
                </h1>
                <span className="select-none text-right text-muted/45">04</span><span />
                <span className="select-none text-right text-muted/45">05</span>
                <p className="m-0 max-w-2xl pl-4 pt-4 font-sans text-[clamp(0.95rem,2vw,1.1rem)] leading-7 text-muted">
                  One focused gateway for application keys, trusted documents, OpenAI-compatible chat, and the request trail behind every answer.
                </p>
                <span className="select-none text-right text-muted/45">06</span><span />
                <span className="select-none text-right text-muted/45">07</span>
                <div className="flex flex-wrap gap-3 pl-4 pt-5">
                  <Link className="border border-brand bg-brand px-3.5 py-2 text-[0.68rem] font-bold text-canvas transition-colors hover:bg-brand-light" href="/dashboard">enter console ↩</Link>
                  <Link className="border border-line-strong px-3.5 py-2 text-[0.68rem] text-soft transition-colors hover:border-soft hover:text-ink" href="/sign-up">create identity</Link>
                </div>
              </div>

              <div className="mt-12 ml-[44px] max-w-2xl border-t border-line font-mono text-[0.66rem] max-md:ml-0">
                <div className="flex items-center justify-between py-3 text-muted"><span>$ synapse trace --latest</span><span className="terminal-caret" /></div>
                {pipeline.map(([step, command, detail, value]) => (
                  <div className="grid grid-cols-[26px_1fr_auto] gap-3 border-t border-line/65 py-2.5" key={step}>
                    <span className="text-muted/50">{step}</span>
                    <span><b className="font-normal text-positive">{command}</b><span className="ml-3 text-muted">{detail}</span></span>
                    <span className="text-brand-light">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-10 grid-cols-[auto_1fr_auto_auto] items-center gap-5 border-t border-line bg-raised px-3 font-mono text-[0.61rem] text-muted max-sm:grid-cols-[auto_1fr_auto]">
          <span className="bg-brand px-2 py-1 text-canvas">NORMAL</span>
          <span>synapse/main</span>
          <span className="max-sm:hidden">UTF-8</span>
          <span>Ln 3, Col 1</span>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 py-5 font-mono text-[0.62rem] text-muted">
        <span>// infrastructure with a pulse.</span>
        <span>auth · retrieve · route · observe</span>
      </div>
    </div>
  );
}
