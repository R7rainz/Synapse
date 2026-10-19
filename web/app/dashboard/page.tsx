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
  const rateLimitedCount = summary?.rate_limited_count ?? 0;
  const errorRate = requestCount === 0 ? 0 : Math.round((errorCount / requestCount) * 100);
  const activeKeys = keys.filter((key) => !key.revoked_at).length;
  const quota = summary?.monthly_token_quota ?? 0;
  const quotaUsed = summary?.monthly_tokens ?? 0;
  const quotaPercent = quota === 0 ? 0 : Math.min(100, Math.round((quotaUsed / quota) * 100));
  const provider = summary?.provider || "Provider not configured";
  const gatewayStatus = loading ? "Syncing" : summary?.provider ? "Operational" : "Needs setup";

  const metrics = [
    ["Requests", loading ? "—" : requestCount.toLocaleString(), "24 hour window", "true"],
    ["Avg. latency", loading ? "—" : `${summary?.average_latency_ms ?? 0} ms`, "across completed calls", undefined],
    ["Error rate", loading ? "—" : `${errorRate}%`, `${errorCount.toLocaleString()} failed requests`, undefined],
    ["Active keys", loading ? "—" : activeKeys.toLocaleString(), `${keys.length} total credentials`, undefined],
  ] as const;

  return (
    <div className="min-h-svh bg-canvas">
      <header className="dashboard-header">
        <div className="dashboard-container">
          <div className="flex items-end justify-between gap-8 max-md:flex-col max-md:items-start">
            <div>
              <p className="dashboard-kicker">Gateway control plane</p>
              <h1 className="dashboard-title">Overview</h1>
              <p className="dashboard-description">Monitor gateway health, recent traffic, credentials, and usage.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link className="button-outline rounded-lg border-line-strong text-soft hover:border-brand hover:text-brand" href="/dashboard/playground">Test gateway <span className="ml-2" aria-hidden="true">↗</span></Link>
              <Link className="button-primary rounded-lg border-brand bg-brand text-canvas hover:bg-brand-light" href="/dashboard/api-keys">Create API key</Link>
            </div>
          </div>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="dashboard-container px-[clamp(1.25rem,4vw,3rem)] py-6">
        <section className="grid grid-cols-4 gap-3 max-xl:grid-cols-2 max-sm:grid-cols-1" aria-label="Gateway metrics">
          {metrics.map(([label, value, detail, accent]) => (
            <article className="metric-card px-5 py-5" data-accent={accent} key={label}>
              <p className="m-0 font-mono text-[0.65rem] tracking-[0.08em] text-muted uppercase">{label}</p>
              <strong className="mt-5 block text-3xl leading-none font-semibold tracking-[-0.04em] text-ink">{value}</strong>
              <span className="mt-3 block text-xs text-muted">{detail}</span>
            </article>
          ))}
        </section>

        <section className="mt-3 grid grid-cols-[minmax(0,1fr)_340px] gap-3 max-xl:grid-cols-1" aria-label="Gateway activity and health">
          <article className="dashboard-panel min-w-0 overflow-hidden">
            <div className="flex items-end justify-between gap-5 border-b border-line px-5 py-4">
              <div>
                <h2 className="dashboard-panel-title">Recent requests</h2>
                <p className="mt-1 mb-0 text-xs text-muted">Latest gateway activity</p>
              </div>
              <Link className="shrink-0 text-sm text-soft transition-colors hover:text-brand" href="/dashboard/requests">View all <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="p-4">{loading ? <p className="m-0 px-2 py-10 font-mono text-xs text-muted">Loading request activity…</p> : <RequestTable requests={requests} />}</div>
          </article>

          <aside className="dashboard-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker">Gateway health</p>
                <h2 className="dashboard-panel-title max-w-[15rem]">{provider}</h2>
              </div>
              <span className={`status-pill ${gatewayStatus === "Operational" ? "text-positive" : "text-brand"}`}>{gatewayStatus}</span>
            </div>

            <div className="mt-6 border-y border-line font-mono text-xs text-soft">
              <div className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-3"><span className="text-muted">01</span><span>Application sends request</span></div>
              <div className="grid grid-cols-[2rem_1fr] gap-3 border-b border-line py-3"><span className="text-brand">02</span><span>Synapse authenticates and forwards</span></div>
              <div className="grid grid-cols-[2rem_1fr] gap-3 py-3"><span className="text-muted">03</span><span>Upstream returns response</span></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="rounded-lg border border-line bg-canvas p-3"><span className="block text-muted">User limit</span><span className="mt-2 block text-soft">{summary?.user_requests_per_minute ?? 0}/min</span></div>
              <div className="rounded-lg border border-line bg-canvas p-3"><span className="block text-muted">Key limit</span><span className="mt-2 block text-soft">{summary?.api_key_requests_per_minute ?? 0}/min</span></div>
            </div>
          </aside>
        </section>

        <section className="mt-3 grid grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-3 max-lg:grid-cols-1" aria-label="Gateway details">
          <article className="dashboard-panel p-5">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="dashboard-kicker">Public route</p>
                <h2 className="dashboard-panel-title">One endpoint for every application</h2>
              </div>
              <span className="status-pill hidden text-positive sm:inline-flex">OpenAI-compatible</span>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-canvas px-4 py-4">
              <code className="font-mono text-sm text-soft">POST /v1/chat/completions</code>
              <Link className="text-sm text-brand hover:text-brand-light" href="/dashboard/playground">Open playground <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 font-mono text-[0.65rem] text-muted max-sm:grid-cols-1">
              <span>Auth / API key</span>
              <span>Storage / metadata only</span>
              <span>Boundary / server-side</span>
            </div>
          </article>

          <article className="dashboard-panel p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="dashboard-kicker">Usage</p>
                <h2 className="dashboard-panel-title">Token volume</h2>
              </div>
              <span className="font-mono text-xs text-muted">Month to date</span>
            </div>
            <div className="mt-7 flex items-end justify-between gap-4">
              <strong className="text-3xl font-semibold tracking-[-0.04em] text-ink">{quotaUsed.toLocaleString()}</strong>
              <span className="font-mono text-xs text-muted">{quota ? `${quota.toLocaleString()} quota` : "No quota set"}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label="Monthly token quota used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={quotaPercent}>
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${quota ? quotaPercent : 0}%` }} />
            </div>
            <div className="mt-4 flex justify-between gap-4 font-mono text-[0.65rem] text-muted"><span>24h: {(summary?.input_tokens ?? 0).toLocaleString()} in · {(summary?.output_tokens ?? 0).toLocaleString()} out</span><span>{quota ? `${quotaPercent}%` : "∞"}</span></div>
          </article>
        </section>

        <section className="mt-3 flex items-center justify-between gap-6 px-1 py-4 max-md:items-start max-md:flex-col">
          <div>
            <p className="eyebrow mb-2 text-muted">Rate limiting</p>
            <p className="m-0 text-sm text-soft">{rateLimitedCount.toLocaleString()} requests were limited in the last 24 hours.</p>
          </div>
          <Link className="text-sm text-brand hover:text-brand-light" href="/dashboard/requests">Inspect request history <span aria-hidden="true">↗</span></Link>
        </section>
      </div>
    </div>
  );
}
