package user

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

func (r *PostgresRepository) CreateUser(ctx context.Context, u *User) error {
	return r.pool.QueryRow(ctx, `INSERT INTO users(email, password_hash) VALUES ($1, $2) RETURNING id, created_at`, u.Email, u.PasswordHash).Scan(&u.ID, &u.CreatedAt)
}

func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	u := &User{}
	err := r.pool.QueryRow(ctx, `SELECT id, email, password_hash, created_at FROM users WHERE email = $1`, email).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}

	return u, nil
}
