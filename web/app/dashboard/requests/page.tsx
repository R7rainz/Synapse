"use client";

import { useEffect, useState } from "react";
import { RequestTable } from "@/components/request-table";
import { apiFetch, readResponse } from "@/lib/api";
import type { GatewayRequest } from "@/lib/types";

export default function RequestsPage() {
  const [requests, setRequests] = useState<GatewayRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/gateway/requests?limit=50")
      .then((response) => readResponse<GatewayRequest[]>(response))
      .then((result) => {
        if (!cancelled) setRequests(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load gateway requests");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-svh bg-canvas">
      <header className="dashboard-header">
        <div className="dashboard-container">
          <p className="dashboard-kicker">Gateway observability</p>
          <h1 className="dashboard-title">Requests</h1>
          <p className="dashboard-description">Inspect recent gateway metadata without storing prompts, generated content, provider credentials, or API-key secrets.</p>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <section className="dashboard-container px-[clamp(1.25rem,4vw,3rem)] py-6">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <p className="dashboard-kicker">Request log</p>
            <h2 className="dashboard-panel-title">Recent gateway traffic</h2>
            <p className="mt-2 mb-0 text-sm text-muted">Newest 50 requests across application keys and the dashboard Playground.</p>
          </div>
          <span className="status-pill text-muted">{loading ? "Loading" : `${requests.length} shown`}</span>
        </div>
        {loading ? <p className="border-y border-line py-10 font-mono text-xs text-muted">Loading request history…</p> : <RequestTable requests={requests} />}
      </section>
    </div>
  );
}
