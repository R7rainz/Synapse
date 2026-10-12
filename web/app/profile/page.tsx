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

  if (isPending) {
    return (
      <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-content-center place-items-center gap-3 font-mono text-xs text-muted" role="status">
        <span className="size-5 animate-spin border border-line-strong border-t-brand" aria-hidden="true" />
        <p className="m-0">reading identity…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-items-center py-10">
        <section className="editor-grid w-full max-w-2xl border border-line bg-surface p-[clamp(1.5rem,7vw,5rem)]">
          <p className="mb-4 font-mono text-[0.66rem] text-danger">E401: identity required</p>
          <h1 className="mb-4 text-[clamp(2.8rem,7vw,5rem)] leading-[0.92] font-semibold tracking-[-0.055em]">This buffer is protected.</h1>
          <p className="mb-7 max-w-lg text-sm text-muted">Authenticate before reading the operator record connected to the Synapse API.</p>
          <Link className="inline-flex h-10 items-center border border-brand bg-brand px-4 font-mono text-[0.68rem] font-bold text-canvas hover:bg-brand-light" href="/sign-in">sign in ↩</Link>
        </section>
      </div>
    );
  }

  const rows = [
    ["name", session.user.name || "Unnamed operator"],
    ["email", session.user.email],
    ["auth_driver", "Better Auth"],
    ["api_connection", profile ? "connected" : "connecting…"],
    ["user_id", profile?.user_id ?? "waiting for API response"],
  ];

  return (
    <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-items-center py-10">
      <section className="w-full max-w-[900px] overflow-hidden border border-line bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex h-9 items-center justify-between border-b border-line bg-raised px-3 font-mono text-[0.64rem] text-muted">
          <span>~/synapse/identity</span><span>operator.json</span><span>read only</span>
        </div>
        <div className="grid grid-cols-[190px_1fr] max-md:grid-cols-1">
          <aside className="border-r border-line bg-canvas/45 p-4 font-mono text-[0.66rem] text-muted max-md:border-r-0 max-md:border-b">
            <p className="mb-5 text-[0.58rem] tracking-[0.16em] text-soft uppercase">Identity</p>
            <span className="mb-5 grid size-16 place-items-center border border-line-strong bg-raised text-2xl text-brand" aria-hidden="true">
              {session.user.name?.charAt(0).toUpperCase() || "U"}
            </span>
            <p className="m-0 truncate py-1 text-soft">{session.user.name}</p>
            <p className="m-0 truncate py-1 text-muted">{session.user.email}</p>
            <p className="mt-6 mb-0 flex items-center gap-2 text-positive"><span className="size-1.5 bg-positive" /> session active</p>
          </aside>

          <div className="editor-grid min-w-0 px-[clamp(1rem,6vw,4rem)] py-10">
            <div className="mb-8">
              <p className="mb-2 font-mono text-[0.66rem] text-brand">// operator manifest</p>
              <h1 className="m-0 text-[clamp(2.5rem,6vw,4.5rem)] leading-none font-semibold tracking-[-0.055em]">Identity record.</h1>
            </div>

            {error && <p className="mb-5 border border-danger/50 bg-danger/5 px-3 py-2.5 font-mono text-xs text-danger" role="alert">{error}</p>}

            <div className="border-y border-line font-mono text-xs">
              {rows.map(([key, value], index) => (
                <div className="grid grid-cols-[32px_150px_minmax(0,1fr)] border-b border-line/60 py-3 last:border-b-0 max-sm:grid-cols-[24px_110px_minmax(0,1fr)]" key={key}>
                  <span className="select-none text-right text-muted/40">{String(index + 1).padStart(2, "0")}</span>
                  <span className="pl-4 text-brand-light">{key}</span>
                  <code className="min-w-0 truncate text-soft">&quot;{value}&quot;</code>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex h-10 items-center border border-brand bg-brand px-4 font-mono text-[0.66rem] font-bold text-canvas transition-colors hover:bg-brand-light" href="/dashboard">open console ↩</Link>
              <button className="inline-flex h-10 items-center border border-line-strong px-4 font-mono text-[0.66rem] text-soft transition-colors hover:border-soft hover:text-ink" type="button" onClick={() => authClient.signOut()}>sign out</button>
            </div>
          </div>
        </div>
        <div className="flex min-h-9 items-center justify-between border-t border-line bg-raised px-3 font-mono text-[0.6rem] text-muted">
          <span className="bg-brand px-2 py-1 text-canvas">NORMAL</span><span>operator.json · UTF-8</span><span>Ln 5, Col 1</span>
        </div>
      </section>
    </div>
  );
}
