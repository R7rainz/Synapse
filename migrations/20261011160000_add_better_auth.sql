-- +goose Up
ALTER TABLE users
    ADD COLUMN name TEXT,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN image TEXT,
    ADD COLUMN updated_at TIMESTAMPTZ;

UPDATE users
SET name = COALESCE(NULLIF(split_part(email, '@', 1), ''), email),
    updated_at = created_at;

ALTER TABLE users
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN email_verified DROP DEFAULT;

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX accounts_user_id_idx ON accounts(user_id);

INSERT INTO accounts (account_id, provider_id, user_id, password, created_at, updated_at)
SELECT id::text, 'credential', id, password_hash, created_at, created_at
FROM users;

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX verifications_identifier_idx ON verifications(identifier);

CREATE TABLE jwks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    alg TEXT,
    crv TEXT
);

ALTER TABLE users DROP COLUMN password_hash;

-- +goose Down
ALTER TABLE users ADD COLUMN password_hash TEXT;

UPDATE users
SET password_hash = accounts.password
FROM accounts
WHERE accounts.user_id = users.id
  AND accounts.provider_id = 'credential';

ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

DROP TABLE jwks;
DROP TABLE verifications;
DROP TABLE sessions;
DROP TABLE accounts;

ALTER TABLE users
    DROP COLUMN updated_at,
    DROP COLUMN image,
    DROP COLUMN email_verified,
    DROP COLUMN name;
