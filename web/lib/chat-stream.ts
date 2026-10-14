type ChatStreamEvent = {
  error?: unknown;
  choices?: Array<{ delta?: { content?: unknown } }>;
};

export async function readChatCompletionStream(
  body: ReadableStream<Uint8Array> | null,
  onDelta: (content: string) => void,
) {
  if (!body) throw new Error("The upstream provider returned no response stream");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  let content = "";

  function dispatchEvent() {
    if (dataLines.length === 0) return;

    const data = dataLines.join("\n");
    dataLines = [];
    if (data === "[DONE]") return;

    let event: ChatStreamEvent;
    try {
      event = JSON.parse(data) as ChatStreamEvent;
    } catch {
      throw new Error("The upstream provider returned an invalid stream");
    }
    if (!event || typeof event !== "object") {
      throw new Error("The upstream provider returned an invalid stream");
    }
    if ("error" in event) {
      throw new Error("The upstream stream failed");
    }

    const delta = event.choices?.[0]?.delta?.content;
    if (typeof delta === "string") {
      content += delta;
      onDelta(delta);
    }
  }

  function readLine(line: string) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) return;

    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") dataLines.push(value);
  }

  function consumeBuffer(final = false) {
    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      let line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      readLine(line);
      newline = buffer.indexOf("\n");
    }

    if (!final) return;
    if (buffer) readLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
    buffer = "";
    dispatchEvent();
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      consumeBuffer();
    }
    buffer += decoder.decode();
    consumeBuffer(true);
    return content;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
