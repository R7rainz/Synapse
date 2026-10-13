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
	return r.pool.QueryRow(ctx, `INSERT INTO llm_requests(user_id, api_key_id, provider, model, input_tokens, output_tokens, status_code, latency_ms, rate_limited) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`, req.UserID, req.APIKeyID, req.Provider, req.Model, req.InputTokens, req.OutputTokens, req.StatusCode, req.LatencyMS, req.RateLimited).Scan(&req.ID, &req.CreatedAt)
}

func (r *PostgresRepository) ConsumeRateLimit(ctx context.Context, scope, scopeID string, limit int) (*RateLimitResult, error) {
	result := &RateLimitResult{}
	var count int64
	if err := r.pool.QueryRow(ctx, `
		INSERT INTO gateway_rate_limit_windows(scope_type, scope_id, window_start, request_count)
		VALUES ($1, $2, date_trunc('minute', timezone('UTC', now())) AT TIME ZONE 'UTC', 1)
		ON CONFLICT (scope_type, scope_id, window_start)
		DO UPDATE SET request_count = LEAST(gateway_rate_limit_windows.request_count + 1, $3::bigint + 1)
		RETURNING request_count, window_start + interval '1 minute'
	`, scope, scopeID, limit).Scan(&count, &result.ResetAt); err != nil {
		return nil, err
	}

	result.Allowed = count <= int64(limit)
	result.Remaining = int64(limit) - count
	if result.Remaining < 0 {
		result.Remaining = 0
	}
	if count == 1 {
		// Best-effort pruning keeps the limiter table bounded without a worker.
		_, _ = r.pool.Exec(ctx, `
			DELETE FROM gateway_rate_limit_windows
			WHERE window_start < date_trunc('minute', timezone('UTC', now())) AT TIME ZONE 'UTC' - interval '2 minutes'
		`)
	}
	return result, nil
}

func (r *PostgresRepository) CheckMonthlyTokenQuota(ctx context.Context, scope, scopeID string, limit int64) (*TokenQuotaResult, error) {
	query := `
		SELECT
			COALESCE(SUM(input_tokens::bigint + output_tokens::bigint), 0),
			date_trunc('month', timezone('UTC', now())) AT TIME ZONE 'UTC' + interval '1 month'
		FROM llm_requests
		WHERE user_id = $1
			AND created_at >= date_trunc('month', timezone('UTC', now())) AT TIME ZONE 'UTC'
	`
	if scope == RateLimitScopeAPIKey {
		query = `
			SELECT
				COALESCE(SUM(input_tokens::bigint + output_tokens::bigint), 0),
				date_trunc('month', timezone('UTC', now())) AT TIME ZONE 'UTC' + interval '1 month'
			FROM llm_requests
			WHERE api_key_id = $1
				AND created_at >= date_trunc('month', timezone('UTC', now())) AT TIME ZONE 'UTC'
		`
	}

	result := &TokenQuotaResult{}
	if err := r.pool.QueryRow(ctx, query, scopeID).Scan(&result.Used, &result.ResetAt); err != nil {
		return nil, err
	}
	result.Allowed = limit < 1 || result.Used < limit
	if limit > 0 {
		result.Remaining = limit - result.Used
		if result.Remaining < 0 {
			result.Remaining = 0
		}
	}
	return result, nil
}

func (r *PostgresRepository) SummaryByUser(ctx context.Context, userID string) (*Summary, error) {
	summary := &Summary{}
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours'),
			COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND (status_code < 200 OR status_code >= 300)),
			COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND rate_limited),
			COALESCE(ROUND(AVG(latency_ms) FILTER (WHERE created_at >= now() - interval '24 hours')), 0)::bigint,
			COALESCE(SUM(input_tokens::bigint) FILTER (WHERE created_at >= now() - interval '24 hours'), 0),
			COALESCE(SUM(output_tokens::bigint) FILTER (WHERE created_at >= now() - interval '24 hours'), 0),
			COALESCE(SUM(input_tokens::bigint + output_tokens::bigint) FILTER (WHERE created_at >= date_trunc('month', timezone('UTC', now())) AT TIME ZONE 'UTC'), 0)
		FROM llm_requests
		WHERE user_id = $1
	`, userID).Scan(&summary.RequestCount, &summary.ErrorCount, &summary.RateLimitedCount, &summary.AverageLatencyMS, &summary.InputTokens, &summary.OutputTokens, &summary.MonthlyTokens)
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
