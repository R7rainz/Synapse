"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    setPending(true);
    setError("");
    setAnswer("");
    try {
      const response = await apiKeyFetch("/v1/chat/completions", chatKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          ...(selectedDocumentIDs.length > 0 ? { document_ids: selectedDocumentIDs } : {}),
        }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text || `Request failed with ${response.status}`);
      try {
        setAnswer(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setAnswer(text);
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not send chat request");
    } finally {
      setPending(false);
    }
  }

  function toggleDocument(id: string) {
    setSelectedDocumentIDs((current) =>
      current.includes(id) ? current.filter((documentID) => documentID !== id) : [...current, id],
    );
  }

  if (isPending) return <p>Loading…</p>;
  if (!session) {
    return (
      <section>
        <h1>Dashboard</h1>
        <p>
          <Link href="/sign-in">Sign in</Link> to continue.
        </p>
      </section>
    );
  }

  return (
    <div className="dashboard">
      <section className="dashboard-heading">
        <p className="eyebrow">Synapse workspace</p>
        <h1>Dashboard</h1>
        <p>Create a knowledge base, manage gateway keys, and try a retrieval-aware chat request.</p>
      </section>

      {error && <p role="alert">{error}</p>}

      <section className="card">
        <h2>Documents</h2>
        <form onSubmit={createDocument}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            Content
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={8} required />
          </label>
          <button disabled={pending}>{pending ? "Embedding…" : "Add document"}</button>
        </form>
        <div className="stack">
          {documents.length === 0 && <p>No documents yet.</p>}
          {documents.map((document) => (
            <div className="list-row" key={document.id}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={selectedDocumentIDs.includes(document.id)}
                  onChange={() => toggleDocument(document.id)}
                />
                <span>
                  <strong>{document.title}</strong>
                  <small>{document.chunk_count} chunks</small>
                </span>
              </label>
              <button type="button" onClick={() => deleteDocument(document.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>API keys</h2>
        <form onSubmit={createAPIKey}>
          <label>
            Key name
            <input value={keyName} onChange={(event) => setKeyName(event.target.value)} required />
          </label>
          <button disabled={pending}>{pending ? "Creating…" : "Create API key"}</button>
        </form>
        {newKey && (
          <p className="secret-note">
            Copy this key now; it will not be shown again: <code>{newKey}</code>
          </p>
        )}
        <div className="stack">
          {keys.length === 0 && <p>No API keys yet.</p>}
          {keys.map((key) => (
            <div className="list-row" key={key.id}>
              <span>
                <strong>{key.name}</strong>
                <small>{key.key_prefix}</small>
              </span>
              {key.revoked_at ? <small>Revoked</small> : <button type="button" onClick={() => revokeAPIKey(key.id)}>Revoke</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Chat playground</h2>
        <form onSubmit={sendChat}>
          <label>
            Synapse API key
            <input type="password" value={chatKey} onChange={(event) => setChatKey(event.target.value)} required />
          </label>
          <label>
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="your-provider-model" required />
          </label>
          <label>
            Prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={5} required />
          </label>
          <button disabled={pending}>{pending ? "Sending…" : "Send chat request"}</button>
        </form>
        {answer && <pre className="response">{answer}</pre>}
      </section>
    </div>
  );
}
