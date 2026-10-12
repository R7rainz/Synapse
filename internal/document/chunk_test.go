package document

import "testing"

func TestChunkText(t *testing.T) {
	content := "abcdefghijklmnopqrstuvwxyz"
	chunks := ChunkText(content)
	if len(chunks) != 1 || chunks[0] != content {
		t.Fatalf("ChunkText(%q) = %#v", content, chunks)
	}
}

func TestChunkTextUsesOverlap(t *testing.T) {
	content := make([]rune, maxChunkRunes+1)
	for i := range content {
		content[i] = 'a'
	}

	chunks := ChunkText(string(content))
	if len(chunks) != 2 {
		t.Fatalf("got %d chunks, want 2", len(chunks))
	}
	if len([]rune(chunks[1])) != chunkOverlap+1 {
		t.Fatalf("second chunk has %d runes, want %d", len([]rune(chunks[1])), chunkOverlap+1)
	}
}
