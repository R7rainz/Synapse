package document

import "strings"

const (
	maxChunkRunes = 1000
	chunkOverlap  = 100
)

func ChunkText(content string) []string {
	runes := []rune(strings.TrimSpace(content))
	if len(runes) == 0 {
		return nil
	}

	chunks := make([]string, 0, (len(runes)/maxChunkRunes)+1)
	for start := 0; start < len(runes); {
		end := start + maxChunkRunes
		if end > len(runes) {
			end = len(runes)
		}

		chunks = append(chunks, string(runes[start:end]))
		if end == len(runes) {
			break
		}
		start = end - chunkOverlap
	}

	return chunks
}
