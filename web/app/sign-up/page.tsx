"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SignUp() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Could not create the account");
      return;
    }
    router.push("/profile");
  }

  return (
    <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-items-center py-10">
      <section className="w-full max-w-[760px] overflow-hidden border border-line bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <div className="flex h-9 items-center justify-between border-b border-line bg-raised px-3 font-mono text-[0.64rem] text-muted">
          <span>~/synapse/auth</span><span>initialize.ts</span><span>1 pane</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] max-md:grid-cols-1">
          <aside className="border-r border-line bg-canvas/45 p-4 font-mono text-[0.66rem] text-muted max-md:border-r-0 max-md:border-b">
            <p className="mb-4 text-[0.58rem] tracking-[0.16em] text-soft uppercase">Bootstrap</p>
            <p className="m-0 py-1 text-brand">› create identity</p>
            <p className="m-0 py-1">  establish session</p>
            <p className="m-0 py-1">  enter console</p>
          </aside>
          <div className="editor-grid px-[clamp(1.5rem,7vw,5rem)] py-[clamp(2.5rem,7vh,4.5rem)]">
            <div className="mb-8">
              <p className="mb-3 font-mono text-[0.66rem] text-brand">// new operator</p>
              <h1 className="mb-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-none font-semibold tracking-[-0.055em]">Initialize identity.</h1>
              <p className="m-0 max-w-md text-sm text-muted">Create the account that will own your keys, documents, and gateway traffic.</p>
            </div>
            <form className="grid gap-4" onSubmit={submit}>
              <label className="grid gap-2 font-mono text-[0.66rem] text-soft">
                display_name
                <input className="h-11 border border-line-strong bg-canvas px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-brand" name="name" autoComplete="name" placeholder="Your name" required />
              </label>
              <label className="grid gap-2 font-mono text-[0.66rem] text-soft">
                email
                <input className="h-11 border border-line-strong bg-canvas px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-brand" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
              </label>
              <label className="grid gap-2 font-mono text-[0.66rem] text-soft">
                password
                <input className="h-11 border border-line-strong bg-canvas px-3 font-sans text-sm text-ink outline-none transition-colors focus:border-brand" name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="8 characters minimum" required />
              </label>
              {error && <p className="m-0 border border-danger/50 bg-danger/5 px-3 py-2.5 font-mono text-xs text-danger" role="alert">{error}</p>}
              <button className="mt-1 h-11 border border-brand bg-brand px-4 font-mono text-[0.68rem] font-bold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
                {pending ? "initializing…" : "create identity ↩"}
              </button>
            </form>
            <p className="mt-7 mb-0 font-mono text-[0.66rem] text-muted">
              already registered? <Link className="text-brand underline decoration-line-strong underline-offset-4 hover:text-brand-light" href="/sign-in">resume session</Link>
            </p>
          </div>
        </div>
        <div className="flex min-h-9 items-center justify-between border-t border-line bg-raised px-3 font-mono text-[0.6rem] text-muted">
          <span className="text-positive">● registration open</span><span>INSERT</span>
        </div>
      </section>
    </div>
  );
}
