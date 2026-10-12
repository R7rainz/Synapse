"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type Profile = { message: string; user_id: string };

export default function ProfilePage() {
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;

    apiFetch("/profile")
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        setProfile(await response.json());
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load profile"));
  }, [session]);

  if (isPending) return <p>Loading…</p>;
  if (!session) {
    return (
      <section>
        <h1>Profile</h1>
        <p>
          <Link href="/sign-in">Sign in</Link> to continue.
        </p>
      </section>
    );
  }

  return (
    <section>
      <p className="eyebrow">Signed in</p>
      <h1>{session.user.name}</h1>
      <p>{session.user.email}</p>
      {profile && <p>Go API user: {profile.user_id}</p>}
      {error && <p role="alert">{error}</p>}
      <button onClick={() => authClient.signOut()}>Sign out</button>
    </section>
  );
}
