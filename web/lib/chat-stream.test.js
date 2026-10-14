import { describe, expect, test } from "bun:test";
import { readChatCompletionStream } from "./chat-stream";

const encoder = new TextEncoder();

function stream(...chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readChatCompletionStream", () => {
  test("reads fragmented SSE deltas and ignores usage", async () => {
    const deltas = [];
    const content = await readChatCompletionStream(
      stream(
        'data: {"choices":[{"delta":{"content":"Hel',
        'lo"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: {"usage":{"prompt_tokens":2,"completion_tokens":2}}\n\ndata: [DONE]\n\n',
      ),
      (delta) => deltas.push(delta),
    );

    expect(content).toBe("Hello world");
    expect(deltas).toEqual(["Hello", " world"]);
  });

  test("accepts a final event without a done marker", async () => {
    const content = await readChatCompletionStream(
      stream('data: {"choices":[{"delta":{"content":"done"}}]}'),
      () => {},
    );

    expect(content).toBe("done");
  });

  test("rejects malformed events without exposing their contents", async () => {
    await expect(readChatCompletionStream(stream("data: private upstream output\n\n"), () => {}))
      .rejects.toThrow("The upstream provider returned an invalid stream");
  });

  test("does not expose provider stream errors", async () => {
    await expect(readChatCompletionStream(stream('data: {"error":{"message":"secret"}}\n\n'), () => {}))
      .rejects.toThrow("The upstream stream failed");
  });
});
