"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { PasswordField } from "@/components/password-field";

export default function SignUp() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [router, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signUp.email({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(result.error.message ?? "Could not create the account");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Could not reach the authentication service");
    } finally {
      setPending(false);
    }
  }

  if (sessionPending || session) {
    return <div className="grid min-h-[calc(100svh-64px)] place-items-center font-mono text-xs text-muted">Loading…</div>;
  }

  return (
    <div className="grid min-h-[calc(100svh-64px)] grid-cols-[minmax(320px,0.8fr)_minmax(480px,1.2fr)] max-lg:grid-cols-1">
      <section className="surface-grid flex flex-col justify-between border-r border-line bg-surface p-[clamp(2rem,6vw,6rem)] max-lg:hidden">
        <p className="m-0 font-mono text-xs tracking-[0.14em] text-brand uppercase">Create a workspace</p>
        <div>
          <h1 className="m-0 max-w-xl text-[clamp(3rem,5vw,6rem)] leading-[0.9] font-semibold tracking-[-0.06em]">Start with a clean model boundary.</h1>
          <p className="mt-7 mb-0 max-w-lg text-base leading-7 text-muted">Your account owns the gateway keys used by your applications and any optional retrieval knowledge.</p>
        </div>
        <ol className="m-0 grid list-none gap-3 p-0 font-mono text-xs text-muted">
          <li><span className="mr-3 text-brand">01</span>Create your account</li>
          <li><span className="mr-3 text-brand">02</span>Create an application key</li>
          <li><span className="mr-3 text-brand">03</span>Send a gateway request</li>
        </ol>
      </section>

      <section className="flex items-center px-[clamp(1.5rem,8vw,9rem)] py-16">
        <div className="w-full max-w-lg">
          <p className="mb-4 font-mono text-xs tracking-[0.14em] text-brand uppercase">Create account</p>
          <h2 className="m-0 text-[clamp(2.7rem,5vw,5rem)] leading-none font-semibold tracking-[-0.055em]">Set up Synapse.</h2>
          <p className="mt-5 mb-10 text-sm leading-6 text-muted">No username is required. Your display name and email identify the workspace owner.</p>

          <form className="grid gap-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium text-soft">
              Display name
              <input className="h-12 border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand" name="name" autoComplete="name" placeholder="Your name" required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soft">
              Email address
              <input className="h-12 border border-line-strong bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-brand" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </label>
            <PasswordField id="sign-up-password" label="Password" name="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" showStrength />
            {error && <p className="m-0 border-l-2 border-danger bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}
            <button className="mt-1 h-12 border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-8 mb-0 text-sm text-muted">Already have an account? <Link className="font-semibold text-brand hover:text-brand-light" href="/sign-in">Sign in</Link></p>
        </div>
      </section>
    </div>
  );
}
