-- +goose Up
ALTER TABLE llm_requests
    ADD COLUMN rate_limited BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE gateway_rate_limit_windows (
    scope_type TEXT NOT NULL CHECK (scope_type IN ('user', 'api_key')),
    scope_id UUID NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count BIGINT NOT NULL CHECK (request_count >= 0),
    PRIMARY KEY (scope_type, scope_id, window_start)
);

CREATE INDEX gateway_rate_limit_windows_prune_idx
    ON gateway_rate_limit_windows(window_start);

-- +goose Down
DROP TABLE gateway_rate_limit_windows;

ALTER TABLE llm_requests
    DROP COLUMN rate_limited;
