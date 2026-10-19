import type { GatewayRequest } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RequestTable({ requests }: { requests: GatewayRequest[] }) {
  if (requests.length === 0) {
    return <p className="m-0 rounded-xl border border-line bg-surface px-5 py-10 text-sm text-muted">No gateway requests have been recorded yet.</p>;
  }

  return (
    <div className="table-shell overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="border-y border-line font-mono text-[0.64rem] tracking-[0.08em] text-muted uppercase">
          <tr>
            <th className="py-3 pr-5 font-normal">Time</th>
            <th className="py-3 pr-5 font-normal">Source</th>
            <th className="py-3 pr-5 font-normal">Provider</th>
            <th className="py-3 pr-5 font-normal">Model</th>
            <th className="py-3 pr-5 font-normal">Status</th>
            <th className="py-3 font-normal">Latency</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const successful = request.status_code >= 200 && request.status_code < 300;
            return (
              <tr className="border-b border-line text-soft transition-colors last:border-b-0 hover:bg-raised/60" key={request.id}>
                <td className="whitespace-nowrap py-4 pr-5 text-xs text-muted">{formatDate(request.created_at)}</td>
                <td className="py-4 pr-5">
                  <span className="block text-sm text-ink">{request.api_key_name || "Dashboard playground"}</span>
                  <span className="mt-1 block font-mono text-[0.62rem] text-muted">{request.api_key_prefix || "session auth"}</span>
                </td>
                <td className="py-4 pr-5 text-xs">{request.provider || "Unconfigured"}</td>
                <td className="py-4 pr-5 font-mono text-xs">{request.model}</td>
                <td className="py-4 pr-5">
                  <span className={`status-pill ${successful ? "text-positive" : "text-danger"}`}>{request.status_code}</span>
                </td>
                <td className="py-4 font-mono text-xs text-muted">{request.latency_ms} ms</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
