package llmrequest

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateLLMRequest(ctx context.Context, req *LLMRequest) error {
	return r.pool.QueryRow(ctx, `INSERT INTO llm_requests(user_id, api_key_id, provider, model, input_tokens, output_tokens, status_code, latency_ms) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`, req.UserID, req.APIKeyID, req.Provider, req.Model, req.InputTokens, req.OutputTokens, req.StatusCode, req.LatencyMS).Scan(&req.ID, &req.CreatedAt)
}
