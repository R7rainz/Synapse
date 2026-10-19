package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
	"unicode"
)

const mockEmbeddingDimensions = 1536

func (c *Client) mockChatCompletions(ctx context.Context, body []byte, stream bool) (*http.Response, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	var input struct {
		Model string `json:"model"`
	}
	_ = json.Unmarshal(body, &input)
	if input.Model == "" {
		input.Model = "mock-model"
	}

	content := fmt.Sprintf("Mock response (local mode). Retrieved context included: %t.", bytes.Contains(body, []byte("retrieved reference text")))
	created := time.Now().Unix()
	if !stream {
		payload, err := json.Marshal(map[string]any{
			"id":      "chatcmpl-mock",
			"object":  "chat.completion",
			"created": created,
			"model":   input.Model,
			"choices": []any{map[string]any{
				"index": 0,
				"message": map[string]string{
					"role":    "assistant",
					"content": content,
				},
				"finish_reason": "stop",
			}},
			"usage": mockUsage(content),
		})
		if err != nil {
			return nil, err
		}
		return newMockResponse("application/json", payload), nil
	}

	var payload bytes.Buffer
	writeChunk := func(chunk map[string]any) error {
		encoded, err := json.Marshal(chunk)
		if err != nil {
			return err
		}
		payload.WriteString("data: ")
		payload.Write(encoded)
		payload.WriteString("\n\n")
		return nil
	}

	for _, chunk := range []map[string]any{
		{
			"id": "chatcmpl-mock", "object": "chat.completion.chunk", "created": created, "model": input.Model,
			"choices": []any{map[string]any{
				"index":         0,
				"delta":         map[string]string{"role": "assistant", "content": "Mock response (local mode). "},
				"finish_reason": nil,
			}},
		},
		{
			"id": "chatcmpl-mock", "object": "chat.completion.chunk", "created": created, "model": input.Model,
			"choices": []any{map[string]any{
				"index":         0,
				"delta":         map[string]string{"content": strings.TrimPrefix(content, "Mock response (local mode). ")},
				"finish_reason": nil,
			}},
		},
		{
			"id": "chatcmpl-mock", "object": "chat.completion.chunk", "created": created, "model": input.Model,
			"choices": []any{},
			"usage":   mockUsage(content),
		},
	} {
		if err := writeChunk(chunk); err != nil {
			return nil, err
		}
	}
	payload.WriteString("data: [DONE]\n\n")
	return newMockResponse("text/event-stream", payload.Bytes()), nil
}

func newMockResponse(contentType string, body []byte) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header: http.Header{
			"Cache-Control": {"no-cache"},
			"Content-Type":  {contentType},
		},
		Body: io.NopCloser(bytes.NewReader(body)),
	}
}

func mockUsage(content string) map[string]int {
	completionTokens := len(strings.Fields(content))
	if completionTokens < 1 {
		completionTokens = 1
	}
	return map[string]int{
		"prompt_tokens":     1,
		"completion_tokens": completionTokens,
		"total_tokens":      completionTokens + 1,
	}
}

func mockEmbeddings(inputs []string) [][]float64 {
	embeddings := make([][]float64, len(inputs))
	for i, input := range inputs {
		embeddings[i] = mockEmbedding(input)
	}
	return embeddings
}

// shortcut: hashed token vectors only validate local retrieval plumbing; use a real embedding model for semantic quality.
func mockEmbedding(input string) []float64 {
	vector := make([]float64, mockEmbeddingDimensions)
	tokens := strings.FieldsFunc(strings.ToLower(input), func(r rune) bool {
		return !unicode.IsLetter(r) && !unicode.IsNumber(r)
	})
	for _, token := range tokens {
		hash := fnv.New32a()
		_, _ = hash.Write([]byte(token))
		sum := hash.Sum32()
		index := int(sum % mockEmbeddingDimensions)
		sign := 1.0
		if sum&1 == 1 {
			sign = -1
		}
		vector[index] += sign
	}
	if len(tokens) == 0 {
		vector[0] = 1
	}

	norm := 0.0
	for _, value := range vector {
		norm += value * value
	}
	norm = math.Sqrt(norm)
	for i := range vector {
		vector[i] /= norm
	}
	return vector
}
