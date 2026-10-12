package api

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/r7rainz/synapse/internal/document"
)

func TestAddRetrievedContext(t *testing.T) {
	body := []byte(`{"model":"test","document_ids":["doc"],"messages":[{"role":"user","content":"hello"}]}`)
	result, err := addRetrievedContext(body, []document.Chunk{{Content: "relevant text"}})
	if err != nil {
		t.Fatal(err)
	}

	var request map[string]json.RawMessage
	if err := json.Unmarshal(result, &request); err != nil {
		t.Fatal(err)
	}
	if _, ok := request["document_ids"]; ok {
		t.Fatal("document_ids should not be forwarded")
	}

	var messages []map[string]string
	if err := json.Unmarshal(request["messages"], &messages); err != nil {
		t.Fatal(err)
	}
	if len(messages) != 2 || messages[0]["role"] != "system" || !strings.Contains(messages[0]["content"], "relevant text") {
		t.Fatalf("unexpected messages: %#v", messages)
	}
}

func TestNormalizeDocumentIDs(t *testing.T) {
	ids, err := normalizeDocumentIDs([]string{
		"550e8400-e29b-41d4-a716-446655440000",
		"550E8400-E29B-41D4-A716-446655440000",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(ids) != 1 || ids[0] != "550e8400-e29b-41d4-a716-446655440000" {
		t.Fatalf("unexpected normalized IDs: %#v", ids)
	}
}
