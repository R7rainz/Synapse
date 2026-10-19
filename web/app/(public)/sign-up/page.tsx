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
    return <div className="grid min-h-[calc(100svh-72px)] place-items-center bg-paper font-mono text-xs text-body-dark">Loading…</div>;
  }

  return (
    <div className="grid min-h-[calc(100svh-72px)] grid-cols-[minmax(320px,0.85fr)_minmax(480px,1.15fr)] bg-paper text-ink-dark max-lg:grid-cols-1">
      <section className="surface-grid flex flex-col justify-between border-r border-hairline bg-stone p-[clamp(2rem,6vw,6rem)] max-lg:hidden">
        <p className="m-0 eyebrow text-deep-green">Create a workspace</p>
        <div>
          <h1 className="display-title m-0 max-w-xl text-[clamp(3rem,5vw,6rem)] leading-[0.9]">Start with a clean model boundary.</h1>
          <p className="mt-7 mb-0 max-w-lg text-base leading-7 text-body-dark">Your account owns the gateway keys used by your applications and any optional retrieval knowledge.</p>
        </div>
        <ol className="m-0 grid list-none gap-3 p-0 font-mono text-xs text-body-dark">
          <li><span className="mr-3 text-coral">01</span>Create your account</li>
          <li><span className="mr-3 text-coral">02</span>Create an application key</li>
          <li><span className="mr-3 text-coral">03</span>Send a gateway request</li>
        </ol>
      </section>

      <section className="flex items-center px-[clamp(1.5rem,8vw,9rem)] py-16">
        <div className="light-field w-full max-w-lg rounded-[22px] p-[clamp(1.5rem,4vw,3rem)]">
          <p className="mb-4 eyebrow text-deep-green">Create account</p>
          <h2 className="display-title m-0 text-[clamp(2.7rem,5vw,5rem)] leading-none">Set up Synapse.</h2>
          <p className="mt-5 mb-10 text-sm leading-6 text-body-dark">No username is required. Your display name and email identify the workspace owner.</p>

          <form className="grid gap-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-medium text-ink-dark">
              Display name
              <input className="form-control h-12 px-3 text-sm" name="name" autoComplete="name" placeholder="Your name" required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink-dark">
              Email address
              <input className="form-control h-12 px-3 text-sm" name="email" type="email" autoComplete="email" placeholder="you@company.com" required />
            </label>
            <PasswordField id="sign-up-password" label="Password" name="password" minLength={8} maxLength={72} autoComplete="new-password" placeholder="At least 8 characters" showStrength />
            {error && <p className="m-0 rounded-md border-l-2 border-danger bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}
            <button className="button-primary mt-1 h-12 rounded-lg border-brand bg-brand text-canvas hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-8 mb-0 text-sm text-body-dark">Already have an account? <Link className="font-semibold text-deep-green hover:text-brand" href="/sign-in">Sign in</Link></p>
        </div>
      </section>
    </div>
  );
}
