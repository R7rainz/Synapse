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
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Gateway observability</p>
          <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">Requests</h1>
          <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Inspect recent gateway metadata without storing prompts, generated content, provider credentials, or API-key secrets.</p>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <section className="mx-auto w-full max-w-[1500px] px-[clamp(1.25rem,4vw,4rem)] py-10">
        <div className="mb-6 flex items-end justify-between gap-5">
          <div>
            <h2 className="m-0 text-lg font-semibold">Recent gateway traffic</h2>
            <p className="mt-2 mb-0 text-sm text-muted">Newest 50 requests across application keys and the dashboard Playground.</p>
          </div>
          <span className="font-mono text-xs text-muted">{loading ? "loading" : `${requests.length} shown`}</span>
        </div>
        {loading ? <p className="border-y border-line py-10 font-mono text-xs text-muted">Loading request history…</p> : <RequestTable requests={requests} />}
      </section>
    </div>
  );
}
