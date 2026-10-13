package gateway

import (
	"strings"
	"testing"
)

func TestParseUsage(t *testing.T) {
	usage, ok := ParseUsage([]byte(`{"usage":{"prompt_tokens":12,"completion_tokens":7}}`))
	if !ok || usage.InputTokens != 12 || usage.OutputTokens != 7 {
		t.Fatalf("usage = %#v, found = %v", usage, ok)
	}

	usage, ok = ParseUsage([]byte(`{"usage":{"input_tokens":4,"output_tokens":3}}`))
	if !ok || usage.InputTokens != 4 || usage.OutputTokens != 3 {
		t.Fatalf("usage = %#v, found = %v", usage, ok)
	}
}

func TestStreamUsageParserHandlesSplitEvents(t *testing.T) {
	parser := NewStreamUsageParser()
	stream := "data: {\"choices\":[]}\n\ndata: {\"usage\":{\"prompt_tokens\":9,\"completion_tokens\":5}}\n\ndata: [DONE]\n\n"
	for _, chunk := range []string{stream[:11], stream[11:37], stream[37:]} {
		if _, err := parser.Write([]byte(chunk)); err != nil {
			t.Fatal(err)
		}
	}
	parser.Finalize()

	usage, ok := parser.Usage()
	if !ok || usage.InputTokens != 9 || usage.OutputTokens != 5 {
		t.Fatalf("usage = %#v, found = %v", usage, ok)
	}
}

func TestStreamUsageParserIgnoresNonUsageEvents(t *testing.T) {
	parser := NewStreamUsageParser()
	_, _ = parser.Write([]byte(strings.Join([]string{"event: message", "data: [DONE]", ""}, "\n")))
	parser.Finalize()

	if _, ok := parser.Usage(); ok {
		t.Fatal("usage should not be found")
	}
}
