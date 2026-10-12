"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { apiFetch, readResponse } from "@/lib/api";
import type { UserDocument } from "@/lib/types";

const maxInlineFileBytes = 15_000_000;
const acceptedFileTypes = "application/pdf,text/plain,text/html,text/css,text/javascript,text/csv,text/markdown,text/xml,.md,.js,.xml";

const fallbackMIMETypes: Record<string, string> = {
  css: "text/css",
  csv: "text/csv",
  html: "text/html",
  js: "text/javascript",
  md: "text/markdown",
  pdf: "application/pdf",
  txt: "text/plain",
  xml: "text/xml",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type GatewayContentBlock =
  | { type: "text"; text: string }
  | { type: "file"; file: { filename: string; file_data: string } };

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 KB";
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function readFileData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Could not read ${file.name}`));
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = file.type || fallbackMIMETypes[extension] || "application/octet-stream";
      resolve(reader.result.replace(/^data:[^;]*;base64,/, `data:${mimeType};base64,`));
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(body: string, status: number) {
  try {
    const result = JSON.parse(body) as { error?: { message?: string } };
    if (result.error?.message) return result.error.message;
  } catch {
    // Compatible upstreams may return plain text errors.
  }
  return body.trim() || `Request failed with ${status}`;
}

export default function PlaygroundPage() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [documentsPending, setDocumentsPending] = useState(true);
  const [selectedDocumentIDs, setSelectedDocumentIDs] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
        if (!cancelled) setDocumentsPending(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDocument(id: string) {
    setSelectedDocumentIDs((current) => {
      if (current.includes(id)) return current.filter((documentID) => documentID !== id);
      if (current.length >= 20) {
        setError("You can attach up to 20 documents to one request");
        return current;
      }
      setError("");
      return [...current, id];
    });
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (incoming.length === 0) return;

    const next = [...files, ...incoming];
    const totalBytes = next.reduce((total, file) => total + file.size, 0);
    if (totalBytes > maxInlineFileBytes) {
      setError("Inline files can total up to 15 MB per request");
      return;
    }

    setFiles(next);
    setError("");
  }

  async function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setPending(true);
    setError("");

    try {
      const fileBlocks = await Promise.all(
        files.map(async (file): Promise<GatewayContentBlock> => ({
          type: "file",
          file: { filename: file.name, file_data: await readFileData(file) },
        })),
      );
      const requestContent: string | GatewayContentBlock[] = fileBlocks.length > 0
        ? [{ type: "text", text: content }, ...fileBlocks]
        : content;
      const response = await apiFetch("/playground/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model.trim(),
          messages: [...messages, { role: "user", content: requestContent }],
          ...(selectedDocumentIDs.length > 0 ? { document_ids: selectedDocumentIDs } : {}),
        }),
      });
      const text = await response.text();
      if (!response.ok) throw new Error(errorMessage(text, response.status));

      let upstreamMessage = text;
      try {
        const result = JSON.parse(text) as ChatCompletionResponse;
        upstreamMessage = result.choices?.[0]?.message?.content ?? "";
      } catch {
        // Some compatible upstreams return plain text.
      }
      if (!upstreamMessage.trim()) throw new Error("The upstream provider returned no message");

      setMessages([...nextMessages, { role: "assistant", content: upstreamMessage }]);
      setPrompt("");
      setFiles([]);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Could not send the gateway request");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b border-line px-[clamp(1.25rem,4vw,4rem)] py-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-end justify-between gap-8 max-md:items-start max-md:flex-col">
          <div>
            <p className="mb-3 font-mono text-[0.68rem] tracking-[0.14em] text-brand uppercase">Diagnostic tool</p>
            <h1 className="m-0 text-[clamp(2.2rem,4vw,4.2rem)] leading-none font-semibold tracking-[-0.05em]">Gateway playground</h1>
            <p className="mt-4 mb-0 max-w-2xl text-sm leading-6 text-muted">Send a test request through Synapse to the configured upstream provider. Synapse authenticates, enriches, forwards, and records the request—it does not host the model.</p>
          </div>
          <label className="grid w-full max-w-sm gap-2 text-sm font-medium text-soft">
            Upstream model
            <input className="h-11 border border-line-strong bg-surface px-3 font-mono text-xs text-ink outline-none transition-colors focus:border-brand" value={model} onChange={(event) => setModel(event.target.value)} placeholder="provider-model" required form="playground-form" />
          </label>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100svh-174px)] w-full max-w-[1500px] grid-cols-[minmax(0,1fr)_320px] max-lg:grid-cols-1">
        <section className="flex min-w-0 flex-col border-r border-line max-lg:border-r-0">
          <div className="flex min-h-[470px] flex-1 flex-col gap-7 px-[clamp(1.25rem,4vw,4rem)] py-10" role="log" aria-live="polite" aria-label="Playground response">
            {messages.length === 0 ? (
              <div className="my-auto max-w-xl">
                <p className="mb-3 font-mono text-xs text-brand">UPSTREAM TEST</p>
                <h2 className="m-0 text-2xl font-semibold tracking-[-0.03em]">Send a diagnostic request</h2>
                <p className="mt-3 mb-0 text-sm leading-7 text-muted">Choose an upstream model and send a message. Add inline files for the model to read directly, optional Knowledge for retrieval, or both.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article className="grid max-w-4xl grid-cols-[110px_minmax(0,1fr)] gap-5 max-sm:grid-cols-1 max-sm:gap-2" key={`${message.role}-${index}`}>
                  <span className={`font-mono text-[0.68rem] uppercase ${message.role === "user" ? "text-brand" : "text-positive"}`}>{message.role === "user" ? "Request" : "Upstream"}</span>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-7 text-soft">{message.content}</p>
                </article>
              ))
            )}
            {pending && <p className="m-0 font-mono text-xs text-positive" role="status">Waiting for the upstream provider…</p>}
          </div>

          <form className="sticky bottom-0 border-t border-line bg-canvas/95 px-[clamp(1.25rem,4vw,4rem)] py-5 backdrop-blur-xl" id="playground-form" onSubmit={sendChat}>
            {error && <p className="mt-0 mb-3 border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
            <div className="flex items-end gap-3 max-sm:flex-col">
              <label className="sr-only" htmlFor="playground-message">Message</label>
              <textarea className="min-h-24 max-h-48 w-full resize-y border border-line-strong bg-surface px-4 py-3 text-sm leading-6 text-ink outline-none transition-colors focus:border-brand" id="playground-message" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="Enter a test message…" required />
              <button className="inline-flex h-12 min-w-28 items-center justify-center border border-brand bg-brand px-5 text-sm font-semibold text-canvas transition-colors hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full" disabled={pending || !model.trim()}>
                {pending ? "Sending…" : "Send request"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.65rem] text-muted">
              <span>{files.length} inline files · {selectedDocumentIDs.length} Knowledge documents</span>
              {messages.length > 0 && <button className="text-muted transition-colors hover:text-ink" type="button" onClick={() => { setMessages([]); setError(""); }} disabled={pending}>Clear test</button>}
            </div>
          </form>
        </section>

        <aside className="bg-surface/45 px-5 py-7 max-lg:order-first max-lg:border-b max-lg:border-line" aria-label="Optional retrieval context">
          <section className="mb-7 border-b border-line pb-7" aria-labelledby="inline-files-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-sm font-semibold text-ink" id="inline-files-heading">Inline files</h2>
              <span className="font-mono text-[0.62rem] text-muted">{formatBytes(files.reduce((total, file) => total + file.size, 0))} / 15 MB</span>
            </div>
            <p className="mt-3 mb-5 text-xs leading-5 text-muted">Files are sent with the next request for the upstream model to read. Synapse does not store them.</p>
            <label className="flex min-h-10 cursor-pointer items-center justify-center border border-line-strong px-3 text-xs font-semibold text-soft transition-colors hover:border-brand hover:text-brand">
              Attach files
              <input className="sr-only" type="file" accept={acceptedFileTypes} multiple onChange={addFiles} disabled={pending} />
            </label>
            {files.length > 0 && (
              <div className="mt-4 border-t border-line">
                {files.map((file, index) => (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3" key={`${file.name}-${file.size}-${index}`}>
                    <span className="min-w-0">
                      <strong className="block truncate text-xs font-medium text-soft">{file.name}</strong>
                      <small className="mt-1 block font-mono text-[0.6rem] text-muted">{formatBytes(file.size)}</small>
                    </span>
                    <button className="min-h-9 px-1 text-xs text-muted transition-colors hover:text-danger disabled:opacity-50" type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} disabled={pending}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <details open>
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Optional retrieval <span className="ml-2 font-mono text-xs font-normal text-brand">{selectedDocumentIDs.length} selected</span></summary>
            <p className="mt-3 mb-5 text-xs leading-5 text-muted">Selected documents are searched before the request is forwarded. Leave this empty to test the gateway without retrieval.</p>
            {documentsPending && <p className="font-mono text-xs text-muted">Loading Knowledge…</p>}
            {!documentsPending && documents.length === 0 && <p className="border-y border-line py-4 text-sm text-muted">No documents available. <Link className="text-brand hover:text-brand-light" href="/dashboard/documents">Add Knowledge</Link>.</p>}
            <div className="grid border-t border-line">
              {documents.map((document) => {
                const selected = selectedDocumentIDs.includes(document.id);
                return (
                  <label className="flex cursor-pointer items-start gap-3 border-b border-line py-3.5" key={document.id}>
                    <input className="mt-1 size-4 accent-brand" type="checkbox" checked={selected} onChange={() => toggleDocument(document.id)} />
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-medium text-soft">{document.title}</strong>
                      <small className="mt-1 block font-mono text-[0.62rem] text-muted">{document.chunk_count} chunks</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
