"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { PasswordField } from "@/components/password-field";

export default function SignIn() {
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
      const result = await authClient.signIn.email({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in");
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
    return <div className="grid min-h-[calc(100svh-72px)] place-items-center bg-paper font-mono text-xs text-body-dark">Loading…</div>;
  }

  return (
    <div className="grid min-h-[calc(100svh-72px)] grid-cols-[minmax(320px,0.85fr)_minmax(480px,1.15fr)] bg-paper text-ink-dark max-lg:grid-cols-1">
      <section className="relative flex flex-col justify-between overflow-hidden bg-deep-green p-[clamp(2rem,6vw,6rem)] text-white max-lg:hidden">
        <div className="surface-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <p className="relative z-10 m-0 eyebrow text-coral-soft">Welcome back</p>
        <div>
          <h1 className="relative z-10 display-title m-0 max-w-xl text-[clamp(3rem,5vw,6rem)] leading-[0.9]">Return to your workspace.</h1>
          <p className="relative z-10 mt-7 mb-0 max-w-lg text-base leading-7 text-white/70">Continue managing application keys, inspecting gateway requests, and testing your configured upstream.</p>
        </div>
        <p className="relative z-10 m-0 font-mono text-xs text-white/60">Session protected by Better Auth</p>
      </section>

      <section className="flex items-center px-[clamp(1.5rem,8vw,9rem)] py-16">
        <div className="light-field w-full max-w-lg rounded-[22px] p-[clamp(1.5rem,4vw,3rem)]">
          <p className="mb-4 eyebrow text-deep-green">Sign in</p>
          <h2 className="display-title m-0 text-[clamp(2.7rem,5vw,5rem)] leading-none">Open your dashboard.</h2>
          <p className="mt-5 mb-10 text-sm leading-6 text-body-dark">Use the email and password connected to your Synapse account.</p>

          <form className="grid gap-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium text-ink-dark">
              Email address
              <input className="form-control h-12 px-3 text-sm" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </label>
            <PasswordField id="sign-in-password" label="Password" name="password" autoComplete="current-password" placeholder="Enter your password" />
            {error && <p className="m-0 rounded-md border-l-2 border-danger bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}
            <button className="button-primary mt-1 h-12 rounded-lg border-brand bg-brand text-canvas hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 mb-0 text-sm text-body-dark">New to Synapse? <Link className="font-semibold text-deep-green hover:text-brand" href="/sign-up">Create an account</Link></p>
        </div>
      </section>
    </div>
  );
}
