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

func (r *PostgresRepository) SummaryByUser(ctx context.Context, userID string) (*Summary, error) {
	summary := &Summary{}
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status_code < 200 OR status_code >= 300),
			COALESCE(ROUND(AVG(latency_ms)), 0)::bigint
		FROM llm_requests
		WHERE user_id = $1 AND created_at >= now() - interval '24 hours'
	`, userID).Scan(&summary.RequestCount, &summary.ErrorCount, &summary.AverageLatencyMS)
	if err != nil {
		return nil, err
	}
	return summary, nil
}

func (r *PostgresRepository) ListByUser(ctx context.Context, userID string, limit int) ([]*RequestRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT r.id, r.api_key_id, k.name, k.key_prefix, r.provider, r.model, r.status_code, r.latency_ms, r.created_at
		FROM llm_requests r
		LEFT JOIN api_keys k ON k.id = r.api_key_id
		WHERE r.user_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]*RequestRecord, 0)
	for rows.Next() {
		request := &RequestRecord{}
		if err := rows.Scan(
			&request.ID,
			&request.APIKeyID,
			&request.APIKeyName,
			&request.APIKeyPrefix,
			&request.Provider,
			&request.Model,
			&request.StatusCode,
			&request.LatencyMS,
			&request.CreatedAt,
		); err != nil {
			return nil, err
		}
		requests = append(requests, request)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return requests, nil
}
