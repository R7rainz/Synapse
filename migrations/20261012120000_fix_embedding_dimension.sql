-- +goose Up
ALTER TABLE document_chunks
    ALTER COLUMN embedding TYPE vector(1536);

CREATE INDEX document_chunks_embedding_hnsw_idx
    ON document_chunks USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;

-- +goose Down
DROP INDEX document_chunks_embedding_hnsw_idx;

ALTER TABLE document_chunks
    ALTER COLUMN embedding TYPE vector;
