package document

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) Create(ctx context.Context, userID, title string, chunks []Chunk) (*Document, error) {
	if len(chunks) == 0 {
		return nil, fmt.Errorf("document must contain at least one chunk")
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	doc := &Document{Title: title, ChunkCount: len(chunks)}
	err = tx.QueryRow(ctx, `
		INSERT INTO documents (user_id, title)
		VALUES ($1, $2)
		RETURNING id, created_at
	`, userID, title).Scan(&doc.ID, &doc.CreatedAt)
	if err != nil {
		return nil, err
	}

	for _, chunk := range chunks {
		vector, err := vectorLiteral(chunk.Embedding)
		if err != nil {
			return nil, err
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
			VALUES ($1, $2, $3, $4::vector)
		`, doc.ID, chunk.Index, chunk.Content, vector)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return doc, nil
}

func (r *PostgresRepository) ListByUser(ctx context.Context, userID string) ([]*Document, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT d.id, d.title, d.created_at, COUNT(c.id)
		FROM documents d
		LEFT JOIN document_chunks c ON c.document_id = d.id
		WHERE d.user_id = $1
		GROUP BY d.id
		ORDER BY d.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := make([]*Document, 0)
	for rows.Next() {
		doc := &Document{}
		if err := rows.Scan(&doc.ID, &doc.Title, &doc.CreatedAt, &doc.ChunkCount); err != nil {
			return nil, err
		}
		documents = append(documents, doc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return documents, nil
}

func (r *PostgresRepository) DeleteByUser(ctx context.Context, userID, documentID string) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM documents
		WHERE id = $1 AND user_id = $2
	`, documentID, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}

func (r *PostgresRepository) EnsureOwned(ctx context.Context, userID string, documentIDs []string) error {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM documents
		WHERE user_id = $1
		  AND id::text = ANY($2::text[])
	`, userID, pgtype.FlatArray[string](documentIDs)).Scan(&count)
	if err != nil {
		return err
	}
	if count != len(documentIDs) {
		return pgx.ErrNoRows
	}

	return nil
}

func (r *PostgresRepository) SearchChunks(ctx context.Context, userID string, documentIDs []string, embedding []float64, limit int) ([]Chunk, error) {
	vector, err := vectorLiteral(embedding)
	if err != nil {
		return nil, err
	}

	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.document_id, c.chunk_index, c.content
		FROM document_chunks c
		JOIN documents d ON d.id = c.document_id
		WHERE d.user_id = $1
		  AND d.id::text = ANY($2::text[])
		  AND c.embedding IS NOT NULL
		ORDER BY c.embedding <=> $3::vector
		LIMIT $4
	`, userID, pgtype.FlatArray[string](documentIDs), vector, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	chunks := make([]Chunk, 0, limit)
	for rows.Next() {
		chunk := Chunk{}
		if err := rows.Scan(&chunk.ID, &chunk.DocumentID, &chunk.Index, &chunk.Content); err != nil {
			return nil, err
		}
		chunks = append(chunks, chunk)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return chunks, nil
}

func vectorLiteral(values []float64) (string, error) {
	if len(values) != EmbeddingDimensions {
		return "", fmt.Errorf("embedding has %d dimensions, want %d", len(values), EmbeddingDimensions)
	}

	var builder strings.Builder
	builder.WriteByte('[')
	for i, value := range values {
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return "", fmt.Errorf("embedding contains a non-finite value")
		}
		if i > 0 {
			builder.WriteByte(',')
		}
		builder.WriteString(strconv.FormatFloat(value, 'f', -1, 64))
	}
	builder.WriteByte(']')
	return builder.String(), nil
}
