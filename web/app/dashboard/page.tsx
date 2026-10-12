"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequestTable } from "@/components/request-table";
import { apiFetch, readResponse } from "@/lib/api";
import type { APIKey, GatewayRequest, GatewaySummary } from "@/lib/types";

export default function DashboardPage() {
  const [summary, setSummary] = useState<GatewaySummary>();
  const [requests, setRequests] = useState<GatewayRequest[]>([]);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch("/gateway/summary").then((response) => readResponse<GatewaySummary>(response)),
      apiFetch("/gateway/requests?limit=10").then((response) => readResponse<GatewayRequest[]>(response)),
      apiFetch("/api-keys").then((response) => readResponse<APIKey[]>(response)),
    ])
      .then(([nextSummary, nextRequests, nextKeys]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setRequests(nextRequests);
        setKeys(nextKeys);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load gateway overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const requestCount = summary?.request_count ?? 0;
  const errorCount = summary?.error_count ?? 0;
  const errorRate = requestCount === 0 ? 0 : Math.round((errorCount / requestCount) * 100);
  const activeKeys = keys.filter((key) => !key.revoked_at).length;

  return (
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-end justify-between gap-8 max-md:items-start max-md:flex-col">
          <div>
            <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Gateway control plane</p>
            <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">Overview</h1>
            <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Monitor the boundary between your applications and the configured upstream LLM provider.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="inline-flex min-h-11 items-center border border-line-strong px-4 text-sm font-semibold text-soft transition-colors hover:border-soft hover:text-ink" href="/dashboard/playground">Test gateway</Link>
            <Link className="inline-flex min-h-11 items-center border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light" href="/dashboard/api-keys">Manage API keys</Link>
          </div>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="mx-auto w-full max-w-[1500px]">
        <section className="grid grid-cols-4 border-b border-line max-xl:grid-cols-2 max-sm:grid-cols-1" aria-label="Gateway metrics">
          {[
            ["Requests", loading ? "—" : requestCount.toLocaleString(), "last 24 hours"],
            ["Errors", loading ? "—" : errorCount.toLocaleString(), loading ? "loading" : `${errorRate}% of requests`],
            ["Average latency", loading ? "—" : `${summary?.average_latency_ms ?? 0} ms`, "last 24 hours"],
            ["Active API keys", loading ? "—" : activeKeys.toLocaleString(), `${keys.length} total credentials`],
          ].map(([label, value, detail], index) => (
            <article className={`min-h-44 px-7 py-7 ${index > 0 ? "border-l border-line max-sm:border-l-0" : ""} ${index === 2 ? "max-xl:border-l-0 max-xl:border-t" : ""} ${index > 1 ? "max-xl:border-t" : ""}`} key={label}>
              <p className="m-0 font-mono text-[0.65rem] tracking-[0.08em] text-muted uppercase">{label}</p>
              <strong className="mt-7 block text-[clamp(2rem,4vw,3.8rem)] leading-none font-semibold tracking-[-0.05em] text-ink">{value}</strong>
              <span className="mt-3 block text-xs text-muted">{detail}</span>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-[minmax(0,1fr)_340px] border-b border-line max-lg:grid-cols-1">
          <div className="min-w-0 px-[clamp(1.25rem,4vw,4rem)] py-10">
            <div className="mb-6 flex items-center justify-between gap-5">
              <div>
                <p className="mb-2 font-mono text-[0.65rem] tracking-[0.08em] text-brand uppercase">Traffic</p>
                <h2 className="m-0 text-xl font-semibold">Recent requests</h2>
              </div>
              <Link className="text-sm font-semibold text-soft transition-colors hover:text-brand" href="/dashboard/requests">View all</Link>
            </div>
            {loading ? <p className="border-y border-line py-10 font-mono text-xs text-muted">Loading request activity…</p> : <RequestTable requests={requests} />}
          </div>

          <aside className="border-l border-line bg-surface/45 px-7 py-10 max-lg:border-t max-lg:border-l-0">
            <p className="mb-2 font-mono text-[0.65rem] tracking-[0.08em] text-brand uppercase">Upstream</p>
            <h2 className="m-0 text-xl font-semibold">{loading ? "Loading…" : summary?.provider || "Not configured"}</h2>
            <p className="mt-3 mb-8 text-sm leading-6 text-muted">Synapse keeps the upstream credential server-side and forwards authenticated application requests to this provider.</p>

            <div className="border-y border-line font-mono text-xs">
              <div className="grid grid-cols-[28px_1fr] gap-3 border-b border-line py-3"><span className="text-muted">01</span><span className="text-soft">Application sends request</span></div>
              <div className="grid grid-cols-[28px_1fr] gap-3 border-b border-line py-3"><span className="text-brand">02</span><span className="text-ink">Synapse authenticates and forwards</span></div>
              <div className="grid grid-cols-[28px_1fr] gap-3 py-3"><span className="text-muted">03</span><span className="text-soft">Upstream generates response</span></div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 px-[clamp(1.25rem,4vw,4rem)] py-10 max-md:grid-cols-1">
          <div>
            <p className="mb-2 font-mono text-[0.65rem] tracking-[0.08em] text-brand uppercase">Application endpoint</p>
            <code className="font-mono text-sm text-soft">POST /v1/chat/completions</code>
            <p className="mt-3 mb-0 max-w-2xl text-sm leading-6 text-muted">External applications authenticate with a Synapse API key. Provider credentials never leave the gateway deployment.</p>
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center border border-line-strong px-4 text-sm font-semibold text-soft transition-colors hover:border-brand hover:text-brand" href="/dashboard/api-keys">Create application key</Link>
        </section>
      </div>
    </div>
  );
}
