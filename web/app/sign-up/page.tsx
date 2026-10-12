"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
    <section>
      <h1>Create account</h1>
      <form onSubmit={submit}>
        <label>
          Display name
          <input name="name" autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
      </form>
      <p>
        Already registered? <Link href="/sign-in">Sign in</Link>.
      </p>
    </section>
  );
}
