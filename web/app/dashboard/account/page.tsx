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
    <div className="min-h-svh bg-canvas">
      <header className="dashboard-header">
        <div className="mx-auto w-full max-w-[1200px]">
          <p className="dashboard-kicker">Workspace owner</p>
          <h1 className="dashboard-title">Account</h1>
          <p className="dashboard-description">Review the identity connected to this workspace and its API connection.</p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[260px_minmax(0,1fr)] gap-3 px-[clamp(1.25rem,4vw,3rem)] py-6 max-md:grid-cols-1">
        <aside className="dashboard-panel px-6 py-6">
          <span className="grid size-14 place-items-center rounded-xl border border-line-strong bg-raised text-xl font-semibold text-brand" aria-hidden="true">
            {session.user.name?.charAt(0).toUpperCase() || "U"}
          </span>
          <h2 className="mt-5 mb-1 truncate text-lg font-normal text-ink">{session.user.name || "Unnamed account"}</h2>
          <p className="m-0 break-all text-sm text-muted">{session.user.email}</p>
          <p className="mt-6 mb-0 status-pill text-positive">Signed in</p>
        </aside>

        <section className="dashboard-panel p-6 max-sm:p-4">
          <div className="mb-8 flex items-center justify-between gap-5 max-sm:items-start max-sm:flex-col">
            <div>
              <p className="dashboard-kicker">Identity record</p>
              <h2 className="dashboard-panel-title">Account details</h2>
              <p className="mt-2 mb-0 text-sm text-muted">Authentication is managed by Better Auth.</p>
            </div>
            <button className="button-outline min-h-11 rounded-lg border-line-strong text-soft hover:border-danger hover:text-danger disabled:opacity-50" type="button" onClick={signOut} disabled={signingOut}>
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
