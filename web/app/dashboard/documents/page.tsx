"use client";

import { type FormEvent, useEffect, useState } from "react";
import { apiFetch, readResponse } from "@/lib/api";
import type { UserDocument } from "@/lib/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingID, setDeletingID] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/documents")
      .then((response) => readResponse<UserDocument[]>(response))
      .then((result) => {
        if (!cancelled) setDocuments(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load documents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
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
      setError(cause instanceof Error ? cause.message : "Could not add the document");
    } finally {
      setCreating(false);
    }
  }

  async function deleteDocument(document: UserDocument) {
    if (!window.confirm(`Delete “${document.title}” and all of its stored chunks?`)) return;

    setDeletingID(document.id);
    setError("");
    try {
      await readResponse(await apiFetch(`/documents/${document.id}`, { method: "DELETE" }));
      setDocuments((current) => current.filter((item) => item.id !== document.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not delete the document");
    } finally {
      setDeletingID("");
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Optional retrieval</p>
          <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">Knowledge</h1>
          <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Add source text only when a request needs retrieval context. Leave this empty to forward requests directly to the upstream provider.</p>
        </div>
      </header>

      {error && <p className="m-0 border-b border-danger/40 bg-danger/5 px-[clamp(1.25rem,4vw,4rem)] py-3 text-sm text-danger" role="alert">{error}</p>}

      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,1fr)_420px] max-xl:grid-cols-[minmax(0,1fr)_360px] max-lg:grid-cols-1">
        <section className="min-w-0 border-r border-line px-[clamp(1.25rem,4vw,4rem)] py-10 max-lg:order-2 max-lg:border-r-0">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="m-0 text-lg font-semibold">Stored documents</h2>
            <span className="font-mono text-xs text-muted">{documents.length} total</span>
          </div>

          {loading && <p className="border-y border-line py-6 font-mono text-xs text-muted">Loading documents…</p>}
          {!loading && documents.length === 0 && (
            <div className="border-y border-line py-12">
              <h3 className="m-0 text-lg font-semibold">No documents yet</h3>
              <p className="mt-2 mb-0 max-w-lg text-sm leading-6 text-muted">Add source text using the form. Synapse will split it into chunks and create embeddings for retrieval.</p>
            </div>
          )}

          <div className="border-t border-line">
            {documents.map((document) => (
              <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-line py-5" key={document.id}>
                <div className="min-w-0">
                  <h3 className="m-0 truncate text-base font-semibold text-ink">{document.title}</h3>
                  <p className="mt-2 mb-0 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.65rem] text-muted">
                    <span>{document.chunk_count} chunks</span>
                    <span>Added {formatDate(document.created_at)}</span>
                  </p>
                </div>
                <button className="min-h-10 px-2 text-sm text-muted transition-colors hover:text-danger disabled:opacity-50" type="button" onClick={() => deleteDocument(document)} disabled={deletingID === document.id}>
                  {deletingID === document.id ? "Deleting…" : "Delete"}
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="bg-surface/45 px-7 py-10 max-lg:order-1 max-lg:border-b max-lg:border-line max-sm:px-4">
          <h2 className="m-0 text-lg font-semibold">Add a document</h2>
          <p className="mt-2 mb-7 text-sm leading-6 text-muted">Document creation calls your configured embedding provider and may use provider credits.</p>
          <form className="grid gap-5" onSubmit={createDocument}>
            <label className="grid gap-2 text-sm font-medium text-soft">
              Title
              <input className="h-11 border border-line-strong bg-canvas px-3 text-sm text-ink outline-none transition-colors focus:border-brand" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Product handbook" required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-soft">
              Source text
              <textarea className="min-h-64 w-full resize-y border border-line-strong bg-canvas px-3 py-3 text-sm leading-6 text-ink outline-none transition-colors focus:border-brand" value={content} onChange={(event) => setContent(event.target.value)} maxLength={65536} placeholder="Paste the material you want Synapse to retrieve…" required />
              <span className="text-right font-mono text-[0.62rem] font-normal text-muted">{content.length.toLocaleString()} / 65,536</span>
            </label>
            <button className="h-11 border border-brand bg-brand px-4 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50" disabled={creating}>
              {creating ? "Creating embeddings…" : "Add document"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
