# Synapse TODO

## 1. Finish the Better Auth setup locally

- [ ] Copy `web/.env.example` to `web/.env.local`.
- [ ] Set `DATABASE_URL` in `web/.env.local` to the same database used by Go.
- [ ] Generate and set a real `BETTER_AUTH_SECRET`:
  `openssl rand -base64 32`
- [ ] Keep secrets only in local environment files; never commit `.env` or `.env.local`.
- [ ] Check the root `.env` has `DATABASE_URL`, `AUTH_ISSUER`, `AUTH_JWKS_URL`, `AUTH_AUDIENCE`, and `FRONTEND_ORIGIN`.
- [ ] Do not rely on the old `JWT_SECRET`; the Go API now verifies Better Auth JWTs through JWKS.
- [ ] Start local Postgres if needed: `docker compose up -d`.
- [ ] Apply migrations against the configured database:
  `bash -c 'set -a; source .env; exec mise exec go@1.27.1 -- goose -dir migrations postgres "$DATABASE_URL" up'`
- [ ] Start Next.js: `cd web && npm install && npm run dev`.
- [ ] Start Go in another terminal: `bash -c 'set -a; source .env; exec go run ./cmd'`.

## 2. Verify authentication end to end

- [ ] Sign up through the Next.js app.
- [ ] Sign in through the Next.js app.
- [ ] Confirm the app can load the protected Go `/profile` endpoint.
- [ ] Confirm `/api/auth/jwks` and `/api/auth/token` work.
- [ ] Confirm old custom-JWT tokens are rejected and Better Auth tokens are accepted.
- [ ] Confirm API-key creation, listing, and revocation still work for the signed-in user.
- [ ] Confirm the existing legacy user can sign in after the Better Auth migration.
- [ ] Run `go test ./...`.
- [ ] Run `go vet ./...`.
- [ ] Run `cd web && npm run typecheck && npm run build`.
- [ ] Test the migration on a backup or disposable database before applying it to production.

## 3. Production auth hardening

- [ ] Replace all localhost URLs with HTTPS production URLs.
- [ ] Use a strong, private `BETTER_AUTH_SECRET` in the deployment secret manager.
- [ ] Configure secure cookies and trusted origins for the real frontend domain.
- [ ] Confirm JWKS key rotation and cache behavior.
- [ ] Configure database backups and test restoring one.
- [ ] Add rate limiting and abuse protection to auth and gateway endpoints.
- [ ] Add email verification and password reset using a transactional email provider.
- [ ] Upgrade Next.js from `16.4.0` to the current patched release before production.
- [ ] Add production logging, error tracking, and health checks.

## 4. Complete the LLM gateway

- [ ] Validate chat-completion request fields and supported models.
- [ ] Configure the provider and keep provider credentials server-side.
- [ ] Map provider failures to stable gateway responses.
- [ ] Add streaming responses if the frontend needs them.
- [ ] Record provider, model, status, latency, and token usage reliably.
- [ ] Add gateway unit and integration tests without making paid provider calls.
- [ ] Add rate limits, quotas, and usage limits before exposing the gateway publicly.
- [x] Add a frontend chat-completion flow using the Synapse API key.

## 5. Build the vector/RAG layer after the gateway

- [x] Decide the embedding model and vector dimension: OpenAI-compatible embeddings with 1,536 dimensions.
- [x] Add text document creation, deletion, and ownership checks.
- [x] Add deterministic chunking and batched embedding generation.
- [x] Store embeddings in pgvector with a cosine HNSW index.
- [x] Add similarity search scoped to the authenticated user and selected document IDs.
- [x] Add retrieved reference context to chat completions.
- [ ] Add tests for document ownership, retrieval, and empty-result behavior.

## 6. Product features to defer until the foundation is stable

- [ ] OAuth/social login.
- [ ] Roles, permissions, and admin tools.
- [ ] Usernames, organizations, and teams.
- [x] Frontend API-key management UI.
- [ ] Billing and usage dashboards.

## Recommended order

1. Run and verify the Better Auth migration locally.
2. Verify signup, sign-in, JWT verification, profile, and API-key flows.
3. Finish and test the provider-backed chat-completion gateway.
4. Add rate limits and usage enforcement.
5. Build document ingestion, embeddings, and vector retrieval. (Implemented; run and verify it locally.)
