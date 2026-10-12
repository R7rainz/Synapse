"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, readResponse } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type Profile = { message: string; user_id: string };

export default function AccountPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [profile, setProfile] = useState<Profile>();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    apiFetch("/profile")
      .then((response) => readResponse<Profile>(response))
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not reach the Synapse API");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/sign-in");
  }

  if (!session) return null;

  return (
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Workspace owner</p>
          <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">Account</h1>
          <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Review the identity connected to this workspace and the API connection it uses.</p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[280px_minmax(0,1fr)] max-md:grid-cols-1">
        <aside className="border-r border-line bg-surface/45 px-7 py-10 max-md:border-r-0 max-md:border-b">
          <span className="grid size-20 place-items-center border border-line-strong bg-raised text-3xl font-semibold text-brand" aria-hidden="true">
            {session.user.name?.charAt(0).toUpperCase() || "U"}
          </span>
          <h2 className="mt-5 mb-1 truncate text-lg font-semibold">{session.user.name || "Unnamed account"}</h2>
          <p className="m-0 break-all text-sm text-muted">{session.user.email}</p>
          <p className="mt-6 mb-0 flex items-center gap-2 font-mono text-xs text-positive"><span className="size-1.5 rounded-full bg-positive" /> Signed in</p>
        </aside>

        <section className="px-[clamp(1.25rem,5vw,5rem)] py-10">
          <div className="mb-8 flex items-center justify-between gap-5 max-sm:items-start max-sm:flex-col">
            <div>
              <h2 className="m-0 text-xl font-semibold">Account details</h2>
              <p className="mt-2 mb-0 text-sm text-muted">Authentication is managed by Better Auth.</p>
            </div>
            <button className="min-h-11 border border-line-strong px-4 text-sm font-semibold text-soft transition-colors hover:border-danger hover:text-danger disabled:opacity-50" type="button" onClick={signOut} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>

          {error && <p className="mb-5 border-l-2 border-danger bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">{error}</p>}

          <dl className="m-0 border-t border-line">
            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-line py-4 max-sm:grid-cols-1 max-sm:gap-1">
              <dt className="text-sm text-muted">Display name</dt>
              <dd className="m-0 text-sm text-soft">{session.user.name || "Not set"}</dd>
            </div>
            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-line py-4 max-sm:grid-cols-1 max-sm:gap-1">
              <dt className="text-sm text-muted">Email address</dt>
              <dd className="m-0 break-all text-sm text-soft">{session.user.email}</dd>
            </div>
            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-line py-4 max-sm:grid-cols-1 max-sm:gap-1">
              <dt className="text-sm text-muted">API connection</dt>
              <dd className={`m-0 font-mono text-xs ${profile ? "text-positive" : error ? "text-danger" : "text-muted"}`}>{profile ? "Connected" : error ? "Unavailable" : "Checking…"}</dd>
            </div>
            <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-line py-4 max-sm:grid-cols-1 max-sm:gap-1">
              <dt className="text-sm text-muted">User ID</dt>
              <dd className="m-0 break-all font-mono text-xs text-soft">{profile?.user_id ?? "Waiting for API response"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
