"use client";

import { type FormEvent, useEffect, useState } from "react";
import { apiFetch, readResponse } from "@/lib/api";
import type { APIKey, CreatedAPIKey } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingID, setRevokingID] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api-keys")
      .then((response) => readResponse<APIKey[]>(response))
      .then((result) => {
        if (!cancelled) setKeys(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load API keys");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const created = await readResponse<CreatedAPIKey>(
        await apiFetch("/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }),
      );
      setKeys((current) => [
        {
          id: created.id,
          name: created.name,
          key_prefix: created.key_prefix,
          created_at: created.created_at,
          last_used_at: null,
          expires_at: null,
          revoked_at: null,
        },
        ...current,
      ]);
      setNewKey(created.api_key);
      setCopied(false);
      setName("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not create the API key");
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setError("Could not copy the key. Select it and copy it manually.");
    }
  }

  async function revokeKey(key: APIKey) {
    if (!window.confirm(`Revoke “${key.name}”? Applications using it will stop working.`)) return;

    setRevokingID(key.id);
    setError("");
    try {
      await readResponse<void>(await apiFetch(`/api-keys/${key.id}`, { method: "DELETE" }));
      setKeys((current) => current.map((item) => (item.id === key.id ? { ...item, revoked_at: new Date().toISOString() } : item)));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not revoke the API key");
    } finally {
      setRevokingID("");
    }
  }

  const activeCount = keys.filter((key) => !key.revoked_at).length;

  return (
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Application access</p>
          <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">API keys</h1>
          <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Create scoped credentials for applications calling the public gateway. The dashboard Playground uses your login session instead.</p>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,1fr)_380px] max-lg:grid-cols-1">
        <section className="min-w-0 border-r border-line px-[clamp(1.25rem,4vw,4rem)] py-10 max-lg:order-2 max-lg:border-r-0">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="m-0 text-lg font-semibold">Credentials</h2>
            <span className="font-mono text-xs text-muted">{activeCount} active</span>
          </div>

          {loading && <p className="border-y border-line py-6 font-mono text-xs text-muted">Loading API keys…</p>}
          {!loading && keys.length === 0 && (
            <div className="border-y border-line py-12">
              <h3 className="m-0 text-lg font-semibold">No API keys yet</h3>
              <p className="mt-2 mb-0 max-w-lg text-sm leading-6 text-muted">Create a key when an application is ready to call the gateway.</p>
            </div>
          )}

          <div className="overflow-x-auto">
            {keys.length > 0 && (
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="border-y border-line font-mono text-[0.64rem] tracking-[0.08em] text-muted uppercase">
                  <tr>
                    <th className="py-3 pr-5 font-normal">Name</th>
                    <th className="py-3 pr-5 font-normal">Prefix</th>
                    <th className="py-3 pr-5 font-normal">Created</th>
                    <th className="py-3 pr-5 font-normal">Last used</th>
                    <th className="py-3 font-normal">Status</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr className="border-b border-line text-soft" key={key.id}>
                      <td className="py-4 pr-5 font-medium text-ink">{key.name}</td>
                      <td className="py-4 pr-5 font-mono text-xs">{key.key_prefix}</td>
                      <td className="py-4 pr-5 text-xs text-muted">{formatDate(key.created_at)}</td>
                      <td className="py-4 pr-5 text-xs text-muted">{formatDate(key.last_used_at)}</td>
                      <td className={`py-4 pr-5 font-mono text-xs ${key.revoked_at ? "text-danger" : "text-positive"}`}>{key.revoked_at ? "Revoked" : "Active"}</td>
                      <td className="py-4 text-right">
                        {!key.revoked_at && <button className="min-h-10 px-2 text-xs text-muted transition-colors hover:text-danger disabled:opacity-50" type="button" onClick={() => revokeKey(key)} disabled={revokingID === key.id}>{revokingID === key.id ? "Revoking…" : "Revoke"}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside className="bg-surface/45 px-7 py-10 max-lg:order-1 max-lg:border-b max-lg:border-line max-sm:px-4">
          <h2 className="m-0 text-lg font-semibold">Create a key</h2>
          <p className="mt-2 mb-7 text-sm leading-6 text-muted">Use a descriptive name so you know which application can be safely revoked later.</p>
          <form className="grid gap-4" onSubmit={createKey}>
            <label className="grid gap-2 text-sm font-medium text-soft">
              Key name
              <input className="h-11 border border-line-strong bg-canvas px-3 text-sm text-ink outline-none transition-colors focus:border-brand" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Development app" required />
            </label>
            <button className="h-11 border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={creating}>
              {creating ? "Creating…" : "Create API key"}
            </button>
          </form>

          {newKey && (
            <div className="mt-8 border-l-2 border-brand bg-brand/5 px-4 py-4">
              <h3 className="m-0 text-sm font-semibold text-brand">Copy this key now</h3>
              <p className="mt-2 mb-4 text-xs leading-5 text-muted">For security, the complete value will not be shown again.</p>
              <code className="block break-all bg-canvas p-3 font-mono text-xs leading-5 text-soft">{newKey}</code>
              <button className="mt-3 min-h-10 border border-line-strong px-3 text-xs font-semibold text-soft transition-colors hover:border-brand hover:text-brand" type="button" onClick={copyKey}>{copied ? "Copied" : "Copy key"}</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
