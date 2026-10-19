"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { apiFetch, readResponse } from "@/lib/api";
import { readChatCompletionStream } from "@/lib/chat-stream";
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
  const [model, setModel] = useState("gpt-4.1-mini");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requestController = useRef<AbortController | null>(null);

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

  useEffect(() => () => requestController.current?.abort(), []);

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
    if (requestController.current) return;

    const content = prompt.trim();
    if (!content) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    const controller = new AbortController();
    requestController.current = controller;
    setPending(true);
    setError("");
    let streamStarted = false;
    let receivedContent = "";

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
          stream: true,
          ...(selectedDocumentIDs.length > 0 ? { document_ids: selectedDocumentIDs } : {}),
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(errorMessage(await response.text(), response.status));

      streamStarted = true;
      setMessages([...nextMessages, { role: "assistant", content: "" }]);
      setPrompt("");
      setFiles([]);
      const upstreamMessage = await readChatCompletionStream(response.body, (delta) => {
        receivedContent += delta;
        setMessages((current) => {
          const assistant = current.at(-1);
          if (assistant?.role !== "assistant") return current;
          return [...current.slice(0, -1), { ...assistant, content: assistant.content + delta }];
        });
      });
      if (!upstreamMessage.trim()) {
        setMessages(nextMessages);
        setError("The upstream provider returned no message");
      }
    } catch (cause: unknown) {
      if (streamStarted && !receivedContent) setMessages(nextMessages);
      if (!controller.signal.aborted) {
        setError(streamStarted
          ? "The upstream response was interrupted"
          : cause instanceof Error ? cause.message : "Could not send the gateway request");
      }
    } finally {
      if (requestController.current === controller) requestController.current = null;
      setPending(false);
    }
  }

  function stopChat() {
    requestController.current?.abort();
  }

  return (
    <div className="min-h-svh bg-canvas">
      <header className="dashboard-header">
        <div className="dashboard-container flex items-end justify-between gap-8 max-md:items-start max-md:flex-col">
          <div>
            <p className="dashboard-kicker">Diagnostic tool</p>
            <h1 className="dashboard-title">Playground</h1>
            <p className="dashboard-description">Send a test request through Synapse to the configured upstream provider.</p>
          </div>
          <label className="grid w-full max-w-sm gap-2 text-sm font-medium text-soft">
            Upstream model
            <input className="form-control h-11 border-line-strong bg-canvas px-3 font-mono text-xs text-ink" value={model} onChange={(event) => setModel(event.target.value)} placeholder="provider-model" required form="playground-form" />
          </label>
        </div>
      </header>

      <div className="dashboard-container grid min-h-[calc(100svh-194px)] grid-cols-[minmax(0,1fr)_340px] gap-3 px-[clamp(1.25rem,4vw,3rem)] py-6 max-lg:grid-cols-1">
        <section className="dashboard-panel flex min-w-0 flex-col overflow-hidden max-lg:order-2">
          <div className="flex min-h-[470px] flex-1 flex-col gap-7 px-[clamp(1.25rem,4vw,4rem)] py-10" role="log" aria-live={pending ? "off" : "polite"} aria-busy={pending} aria-label="Playground response">
            {messages.length === 0 ? (
              <div className="my-auto max-w-xl">
                <p className="dashboard-kicker">Upstream test</p>
                <h2 className="dashboard-panel-title">Send a diagnostic request</h2>
                <p className="mt-3 mb-0 text-sm leading-7 text-muted">Choose a model and send a message. Add inline files, optional Knowledge, or both.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article className="grid max-w-4xl grid-cols-[110px_minmax(0,1fr)] gap-5 border-b border-line pb-6 max-sm:grid-cols-1 max-sm:gap-2" key={`${message.role}-${index}`}>
                  <span className={`font-mono text-[0.68rem] uppercase ${message.role === "user" ? "text-brand" : "text-positive"}`}>{message.role === "user" ? "Request" : "Upstream"}</span>
                  <p className="m-0 whitespace-pre-wrap text-sm leading-7 text-soft">{message.content}</p>
                </article>
              ))
            )}
            {pending && <p className="m-0 font-mono text-xs text-positive" role="status">Waiting for the upstream stream…</p>}
          </div>

          <form className="sticky bottom-0 border-t border-line bg-surface px-[clamp(1.25rem,4vw,3rem)] py-5" id="playground-form" onSubmit={sendChat}>
            {error && <p className="mt-0 mb-3 rounded-md border-l-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
            <div className="flex items-end gap-3 max-sm:flex-col">
              <label className="sr-only" htmlFor="playground-message">Message</label>
              <textarea className="form-control dashboard-control min-h-24 max-h-48 w-full resize-y px-4 py-3 text-sm leading-6" id="playground-message" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={3} placeholder="Enter a test message…" required />
              <button
                className={pending
                  ? "button-outline h-12 min-w-28 rounded-lg border-danger text-danger hover:bg-danger/10 max-sm:w-full"
                  : "button-primary h-12 min-w-28 rounded-lg border-brand bg-brand text-canvas hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50 max-sm:w-full"}
                type={pending ? "button" : "submit"}
                onClick={pending ? stopChat : undefined}
                disabled={!pending && !model.trim()}
              >
                {pending ? "Stop" : "Send request"}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[0.65rem] text-muted">
              <span>{files.length} inline files · {selectedDocumentIDs.length} Knowledge documents</span>
              {messages.length > 0 && <button className="text-muted transition-colors hover:text-ink" type="button" onClick={() => { setMessages([]); setError(""); }} disabled={pending}>Clear test</button>}
            </div>
          </form>
        </section>

        <aside className="dashboard-panel p-5 max-lg:order-first" aria-label="Optional retrieval context">
          <section className="mb-7 border-b border-line pb-7" aria-labelledby="inline-files-heading">
            <div className="flex items-center justify-between gap-3">
              <h2 className="m-0 text-base font-normal text-ink" id="inline-files-heading">Inline files</h2>
              <span className="font-mono text-[0.62rem] text-muted">{formatBytes(files.reduce((total, file) => total + file.size, 0))} / 15 MB</span>
            </div>
            <p className="mt-3 mb-5 text-xs leading-5 text-muted">Files are sent with the next request for the upstream model to read. Synapse does not store them.</p>
            <label className="flex min-h-10 cursor-pointer items-center justify-center rounded-full border border-line-strong px-3 text-xs font-semibold text-soft transition-colors hover:border-brand hover:text-brand">
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
