-- +goose Up
CREATE INDEX llm_requests_api_key_created_at_idx
    ON llm_requests(api_key_id, created_at DESC)
    WHERE api_key_id IS NOT NULL;

-- +goose Down
DROP INDEX llm_requests_api_key_created_at_idx;
