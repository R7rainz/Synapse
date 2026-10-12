"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { apiFetch, apiKeyFetch } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type UserDocument = {
  id: string;
  title: string;
  chunk_count: number;
  created_at: string;
};

type APIKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type CreatedAPIKey = {
  api_key: string;
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [chatKey, setChatKey] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedDocumentIDs, setSelectedDocumentIDs] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [chatPending, setChatPending] = useState(false);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    Promise.all([apiFetch("/documents"), apiFetch("/api-keys")])
      .then(async ([documentsResponse, keysResponse]) => {
        const [nextDocuments, nextKeys] = await Promise.all([
          readResponse<UserDocument[]>(documentsResponse),
          readResponse<APIKey[]>(keysResponse),
        ]);
        if (!cancelled) {
          setDocuments(nextDocuments);
          setKeys(nextKeys);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load dashboard");
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await apiFetch("/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const document = await readResponse<UserDocument>(response);
      setDocuments((current) => [document, ...current]);
      setTitle("");
      setContent("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not create document");
    } finally {
      setPending(false);
    }
  }

  async function deleteDocument(id: string) {
    setError("");
    try {
      await readResponse(await apiFetch(`/documents/${id}`, { method: "DELETE" }));
      setDocuments((current) => current.filter((document) => document.id !== id));
      setSelectedDocumentIDs((current) => current.filter((documentID) => documentID !== id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not delete document");
    }
  }

  async function createAPIKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await apiFetch("/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const created = await readResponse<CreatedAPIKey>(response);
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
      setChatKey(created.api_key);
      setKeyName("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not create API key");
    } finally {
      setPending(false);
    }
  }

  async function revokeAPIKey(id: string) {
    setError("");
    try {
      await readResponse(await apiFetch(`/api-keys/${id}`, { method: "DELETE" }));
      setKeys((current) =>
        current.map((key) => (key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key)),
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not revoke API key");
    }
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = prompt.trim();
    if (!message) return;

    const nextMessages = [...chatMessages, { role: "user" as const, content: message }];
    setChatPending(true);
    setError("");
    try {
      const response = await apiKeyFetch("/v1/chat/completions", chatKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: nextMessages,
          ...(selectedDocumentIDs.length > 0 ? { document_ids: selectedDocumentIDs } : {}),
        }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Request failed with ${response.status}`);

      let assistantMessage = text;
      try {
        const result = JSON.parse(text) as ChatCompletionResponse;
        assistantMessage = result.choices?.[0]?.message?.content ?? "";
      } catch {
        // Keep plain-text provider responses usable.
      }
      if (!assistantMessage.trim()) {
        throw new Error("The provider returned no assistant message");
      }

      setChatMessages([...nextMessages, { role: "assistant", content: assistantMessage }]);
      setPrompt("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not send chat request");
    } finally {
      setChatPending(false);
    }
  }

  function clearChat() {
    setChatMessages([]);
    setError("");
  }

  function toggleDocument(id: string) {
    setSelectedDocumentIDs((current) =>
      current.includes(id) ? current.filter((documentID) => documentID !== id) : [...current, id],
    );
  }

  const activeKeyCount = keys.filter((key) => !key.revoked_at).length;

  if (isPending) {
    return (
      <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-content-center place-items-center gap-3 font-mono text-xs text-muted" role="status">
        <span className="size-5 animate-spin border border-line-strong border-t-brand" aria-hidden="true" />
        <p className="m-0">booting console…</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="grid min-h-[calc(100svh-52px)] animate-page-in place-items-center py-10">
        <section className="editor-grid w-full max-w-2xl border border-line bg-surface p-[clamp(1.5rem,7vw,5rem)]">
          <p className="mb-4 font-mono text-[0.66rem] text-danger">E401: console requires an identity</p>
          <h1 className="mb-4 text-[clamp(2.8rem,7vw,5rem)] leading-[0.92] font-semibold tracking-[-0.055em]">Access denied.</h1>
          <p className="mb-7 max-w-lg text-sm text-muted">Documents, gateway keys, and conversations live behind this checkpoint.</p>
          <Link className="inline-flex h-10 items-center border border-brand bg-brand px-4 font-mono text-[0.68rem] font-bold text-canvas hover:bg-brand-light" href="/sign-in">sign in ↩</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="animate-page-in py-4">
      <section className="overflow-hidden border border-line bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex h-9 items-center justify-between border-b border-line bg-raised px-3 font-mono text-[0.62rem] text-muted">
          <span>~/synapse/console</span><span>gateway.session</span><span>main</span>
        </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-5 border-b border-line px-4 py-3 max-md:grid-cols-1">
        <div>
          <p className="m-0 font-mono text-[0.66rem] text-soft"><span className="text-brand">operator@{session.user.name?.split(" ")[0]?.toLowerCase() || "unknown"}</span>:~/gateway$ <span className="terminal-caret">open session</span></p>
        </div>
        <div className="flex gap-5 font-mono text-[0.6rem] text-muted max-md:justify-between" aria-label="Workspace summary">
          <span><b className="mr-1 font-normal text-ink">{documents.length}</b> docs</span>
          <span><b className="mr-1 font-normal text-ink">{activeKeyCount}</b> keys</span>
          <span><b className="mr-1 font-normal text-ink">{selectedDocumentIDs.length}</b> selected</span>
        </div>
      </div>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-4 py-2.5 font-mono text-xs text-danger" role="alert">{error}</p>}

      <div className="grid min-h-[calc(100svh-166px)] grid-cols-[280px_minmax(0,1fr)] max-lg:grid-cols-1">
        <section className="order-2 flex min-w-0 flex-col overflow-hidden bg-surface">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-raised px-4 py-2.5 max-sm:items-start">
            <div>
              <p className="m-0 font-mono text-[0.65rem] text-soft">chat.buffer <span className="ml-2 text-muted">// gateway conversation</span></p>
            </div>
            <div className="flex items-center gap-2 max-sm:justify-between">
              <span className="inline-flex px-2 py-1 font-mono text-[0.6rem] text-positive">
                {selectedDocumentIDs.length === 0 ? "No sources" : `${selectedDocumentIDs.length} source${selectedDocumentIDs.length === 1 ? "" : "s"}`}
              </span>
              {chatMessages.length > 0 && (
                <button className="min-h-7 border border-line-strong bg-transparent px-2.5 font-mono text-[0.6rem] text-muted transition-colors hover:border-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={clearChat} disabled={chatPending}>
                  :clear
                </button>
              )}
            </div>
          </div>

          <form className="grid" onSubmit={sendChat}>
            <div className="grid grid-cols-2 gap-3 border-b border-line bg-canvas/45 px-4 py-3 max-md:grid-cols-1">
              <label className="grid gap-1.5 font-mono text-[0.61rem] text-muted">
                gateway_key
                <input
                  className="h-9 border border-line-strong bg-canvas px-2.5 font-mono text-[0.68rem] text-ink outline-none transition-colors focus:border-brand"
                  type="password"
                  value={chatKey}
                  onChange={(event) => setChatKey(event.target.value)}
                  placeholder="sk_••••••••••••"
                  required
                />
              </label>
              <label className="grid gap-1.5 font-mono text-[0.61rem] text-muted">
                model
                <input
                  className="h-9 border border-line-strong bg-canvas px-2.5 font-mono text-[0.68rem] text-ink outline-none transition-colors focus:border-brand"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="provider-model"
                  required
                />
              </label>
            </div>

            <div className="editor-grid flex min-h-[420px] max-h-[55vh] flex-col gap-4 overflow-y-auto bg-canvas px-4 py-5 max-sm:min-h-[350px]" role="log" aria-live="polite" aria-label="Conversation">
              {chatMessages.length === 0 ? (
                <div className="m-auto w-full max-w-md font-mono text-[0.68rem] leading-6">
                  <p className="m-0 text-muted"><span className="mr-3 text-muted/40">01</span><span className="text-brand"># new conversation</span></p>
                  <p className="m-0 text-muted"><span className="mr-3 text-muted/40">02</span></p>
                  <p className="m-0 text-soft"><span className="mr-3 text-muted/40">03</span>configure a key and model above.</p>
                  <p className="m-0 text-soft"><span className="mr-3 text-muted/40">04</span>select documents from the explorer if context is needed.</p>
                  <p className="m-0 text-muted"><span className="mr-3 text-muted/40">05</span><span className="terminal-caret">awaiting input</span></p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <article
                    className="grid w-full grid-cols-[30px_minmax(0,1fr)] gap-3 font-mono text-xs"
                    key={`${message.role}-${index}`}
                  >
                    <span className="select-none text-right text-muted/40">{String(index + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <small className={`mb-1 block text-[0.61rem] ${message.role === "user" ? "text-brand-light" : "text-positive"}`}>{message.role === "user" ? "operator" : "synapse"}</small>
                      <p className="m-0 whitespace-pre-wrap border-l border-line-strong pl-3 font-sans text-sm leading-6 text-soft">
                        {message.content}
                      </p>
                    </div>
                  </article>
                ))
              )}
              {chatPending && (
                <div className="inline-flex items-center gap-2 pl-[42px] font-mono text-[0.65rem] text-positive" role="status">
                  <span className="size-3 animate-spin border border-line-strong border-t-brand" aria-hidden="true" />
                  processing request…
                </div>
              )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-line bg-raised px-4 py-3 max-sm:grid-cols-1">
              <label className="sr-only" htmlFor="chat-message">Message</label>
              <textarea
                className="min-h-[68px] max-h-40 w-full resize-y border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand"
                id="chat-message"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder="Ask something about your knowledge base…"
                required
              />
              <button className="inline-flex h-10 min-w-24 items-center justify-center border border-brand bg-brand px-4 font-mono text-[0.66rem] font-bold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full" disabled={chatPending}>
                {chatPending ? "sending…" : "send ↩"}
              </button>
            </div>
            <div className="grid min-h-8 grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-t border-line bg-raised px-3 font-mono text-[0.58rem] text-muted max-sm:grid-cols-[auto_1fr_auto]">
              <span className="bg-brand px-2 py-1 text-canvas">{chatPending ? "BUSY" : "NORMAL"}</span>
              <span>{model || "model:unset"}</span>
              <span className="max-sm:hidden">{selectedDocumentIDs.length} context</span>
              <span>{chatMessages.length} messages</span>
            </div>
          </form>
        </section>

        <aside className="order-1 min-h-0 overflow-y-auto border-r border-line bg-canvas/45 max-lg:grid max-lg:grid-cols-2 max-lg:border-r-0 max-lg:border-b max-md:grid-cols-1" aria-label="Workspace resources">
          <section className="overflow-hidden border-b border-line max-lg:border-r max-md:border-r-0">
            <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5">
              <div>
                <p className="m-0 font-mono text-[0.63rem] text-soft">⌄ documents/</p>
              </div>
              <span className="font-mono text-[0.6rem] text-muted">{documents.length}</span>
            </div>
            <form className="grid gap-2 border-b border-line px-3 py-3" onSubmit={createDocument}>
              <label className="grid gap-1.5 font-mono text-[0.59rem] text-muted">
                title
                <input className="h-8 border border-line-strong bg-canvas px-2 font-sans text-xs text-ink outline-none transition-colors focus:border-brand" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Product handbook" required />
              </label>
              <label className="grid gap-1.5 font-mono text-[0.59rem] text-muted">
                source_text
                <textarea
                  className="min-h-20 w-full resize-y border border-line-strong bg-canvas px-2 py-2 font-sans text-xs text-ink outline-none transition-colors focus:border-brand"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Paste the content you want Synapse to retrieve…"
                  rows={5}
                  required
                />
              </label>
              <button className="inline-flex h-8 w-full items-center justify-center border border-line-strong bg-raised px-3 font-mono text-[0.6rem] text-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
                {pending ? "embedding…" : "+ add document"}
              </button>
            </form>
            <div className="grid">
              {documents.length === 0 && <p className="m-0 px-3 py-4 font-mono text-[0.61rem] text-muted">└ empty</p>}
              {documents.map((document) => {
                const selected = selectedDocumentIDs.includes(document.id);
                return (
                  <div className={`flex min-w-0 items-center justify-between gap-2 border-b border-line/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-raised ${selected ? "bg-raised shadow-[inset_2px_0_#ff6b42]" : ""}`} key={document.id}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input className="size-3 accent-brand" type="checkbox" checked={selected} onChange={() => toggleDocument(document.id)} />
                      <span className="font-mono text-[0.62rem] text-muted" aria-hidden="true">md</span>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="truncate font-mono text-[0.62rem] font-normal text-soft">{document.title}</strong>
                        <small className="font-mono text-[0.56rem] text-muted">{document.chunk_count} chunks</small>
                      </span>
                    </label>
                    <button className="px-1 font-mono text-[0.58rem] text-muted transition-colors hover:text-danger" type="button" onClick={() => deleteDocument(document.id)}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5">
              <div>
                <p className="m-0 font-mono text-[0.63rem] text-soft">⌄ api-keys/</p>
              </div>
              <span className="font-mono text-[0.6rem] text-muted">{activeKeyCount}</span>
            </div>
            <form className="grid gap-2 border-b border-line px-3 py-3" onSubmit={createAPIKey}>
              <label className="grid gap-1.5 font-mono text-[0.59rem] text-muted">
                key_name
                <input className="h-8 border border-line-strong bg-canvas px-2 font-sans text-xs text-ink outline-none transition-colors focus:border-brand" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Development" required />
              </label>
              <button className="inline-flex h-8 items-center justify-center border border-line-strong bg-raised px-3 font-mono text-[0.6rem] text-soft transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50" disabled={pending}>
                {pending ? "creating…" : "+ create key"}
              </button>
            </form>
            {newKey && (
              <div className="m-3 grid gap-1.5 border border-brand/50 bg-brand/5 p-2.5">
                <strong className="font-mono text-[0.61rem] font-normal text-brand">copy key now</strong>
                <code className="font-mono text-[0.6rem] text-soft [overflow-wrap:anywhere]">{newKey}</code>
                <small className="font-mono text-[0.55rem] text-muted">not shown again</small>
              </div>
            )}
            <div className="grid">
              {keys.length === 0 && <p className="m-0 px-3 py-4 font-mono text-[0.61rem] text-muted">└ empty</p>}
              {keys.map((key) => (
                <div className="flex min-w-0 items-center justify-between gap-2 border-b border-line/60 px-3 py-2.5 transition-colors last:border-b-0 hover:bg-raised" key={key.id}>
                  <span className="grid min-w-0 gap-0.5">
                    <strong className="truncate font-mono text-[0.62rem] font-normal text-soft">{key.name}</strong>
                    <code className="font-mono text-[0.56rem] text-muted">{key.key_prefix}</code>
                  </span>
                  {key.revoked_at ? (
                    <span className="font-mono text-[0.56rem] text-danger">revoked</span>
                  ) : (
                    <button className="font-mono text-[0.58rem] text-muted transition-colors hover:text-danger" type="button" onClick={() => revokeAPIKey(key.id)}>
                      revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <div className="grid min-h-9 grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-t border-line bg-raised px-3 font-mono text-[0.58rem] text-muted max-sm:grid-cols-[auto_1fr_auto]">
        <span className="text-positive">● gateway online</span>
        <span>operator: {session.user.name || session.user.email}</span>
        <span className="max-sm:hidden">{activeKeyCount} active keys</span>
        <span>UTF-8</span>
      </div>
      </section>
    </div>
  );
}
