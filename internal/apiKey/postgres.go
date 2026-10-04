package apikey

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

func (r *PostgresRepository) CreateAPIKey(ctx context.Context, a *APIKey) error {
	return r.pool.QueryRow(ctx, `INSERT INTO api_keys(user_id, name, key_prefix, key_hash, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`, a.UserID, a.Name, a.KeyPrefix, a.KeyHash, a.ExpiresAt).Scan(&a.ID, &a.CreatedAt)
}

func (r *PostgresRepository) AuthenticateAPIKeyByHash(ctx context.Context, hash string) (*APIKey, error) {
	a := &APIKey{}
	err := r.pool.QueryRow(ctx, `UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at> now()) RETURNING id, user_id, name, key_prefix, key_hash, created_at, last_used_at, expires_at, revoked_at`, hash).Scan(&a.ID, &a.UserID, &a.Name, &a.KeyPrefix, &a.KeyHash, &a.CreatedAt, &a.LastUsedAt, &a.ExpiresAt, &a.RevokedAt)
	if err != nil {
		return nil, err
	}

	return a, nil
}

func (r *PostgresRepository) RevokeAPIKey(ctx context.Context, userID, keyID string) error {
	var revokedID string

	return r.pool.QueryRow(ctx, `UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`, keyID, userID).Scan(&revokedID)
}

func (r *PostgresRepository) ListAPIKeysByUser(ctx context.Context, userID string) ([]*APIKey, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, user_id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]*APIKey, 0)

	for rows.Next() {
		key := &APIKey{}

		if err := rows.Scan(&key.ID, &key.UserID, &key.Name, &key.KeyPrefix, &key.CreatedAt, &key.LastUsedAt, &key.ExpiresAt, &key.RevokedAt); err != nil {
			return nil, err
		}

		keys = append(keys, key)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return keys, nil
}
