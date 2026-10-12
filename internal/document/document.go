package document

import "time"

const EmbeddingDimensions = 1536

type Document struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	ChunkCount int       `json:"chunk_count"`
	CreatedAt  time.Time `json:"created_at"`
}

type Chunk struct {
	ID         string
	DocumentID string
	Index      int
	Content    string
	Embedding  []float64
}
