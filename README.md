# KryptoPesa

**Project category: fintech web application, not a data engineering pipeline.** The Go API is read-only, Angular provides a staged account UI, and SQL files are Supabase schema/permission migrations. There is no ETL, orchestration, lineage or backfill subsystem.

Crypto-to-M-Pesa application under development. The existing static frontend remains the primary UI. A staged Angular account page at `/next/` uses a read-only Go endpoint at `/api/account`. Deposits and payouts remain disabled; identity verification remains sandbox-only.

## Reproduce the build

Requirements: Node.js 24.15+ (24.x), npm, Go 1.27.4+. Dependencies are locked; do not use `npm install` in CI.

```sh
npm ci
npm ci --prefix web
cp .env.example .env.local
# Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local.
npm run lint
npm run format:check
npm test
npm test --prefix web
npm run build:all
npm start
```

Only the Supabase **anon or publishable** key belongs in browser configuration. It is public by design, and database RLS remains mandatory. The build rejects missing configuration and service-role/secret keys. `dist/config.js` is generated, not committed. The deployment only serves allowlisted assets, excluding tests, database scripts, documentation and environment files.

Tests need no production credentials. A clean fixture build can use `PUBLIC_SUPABASE_URL=https://fixture.supabase.co` and `PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ci_fixture`; these are intentionally non-working values. Environment variables override `.env.local`.

## Go API

```sh
go vet ./api ./cmd/... ./pkg/...
go test -race -coverprofile=coverage.out ./api ./cmd/... ./pkg/...
node scripts/check-go-coverage.cjs coverage.out
# Export the two PUBLIC_SUPABASE_* values in your shell, then:
go run ./cmd/server
```

The local API binds to `127.0.0.1:8080` by default (`LISTEN_ADDR` overrides it). `npm start` serves static assets only; the standalone Go server also serves a built dist/ on the same origin. Do not send bearer tokens to an unrelated API origin.

`GET /api/account` accepts `Authorization: Bearer <access token>`. It validates the token through Supabase Auth, requires confirmed email, queries the validated user's profile using the same bearer token (preserving RLS), and requires `account_status = active`. It returns only `username`, `account_status`, and `kyc_status`. It does not accept an owner ID from the caller. Responses are never cached. Errors are generic and upstream calls have bounded durations and response sizes.

## Deployment

Vercel reads `vercel.json`, runs `npm ci && npm ci --prefix web`, builds static and Angular assets, and deploys `api/account.go` as a Go function. Production requires the two public Supabase environment variables. Preview builds should use a separate staging project; previews without those variables fail closed rather than using production credentials.

GitHub Actions runs frontend checks, Angular tests/build, both npm dependency audits (high severity gate), Go vet/build and race tests with a 70% statement-coverage gate on pushes and pull requests. A separate job builds the Docker image and tests the isolated API. Dependabot checks npm, Go, Actions and Docker weekly. It does not publish a package or submit anything for licensing. CI is secret-free.

## Source map

| Path | Purpose |
| --- | --- |
| Root HTML, assets/pages | Existing product pages and external scripts |
| account-access.js | Fail-closed browser navigation guard |
| scripts | Validated public configuration and deployment packaging |
| web | Angular account UI and integration tests |
| pkg/account | Go account authorization and regression tests |
| api/account.go | Vercel adapter |
| cmd/server | Standalone Go server with timeouts and graceful shutdown |
| supabase/migrations | Incremental migration for the existing database |
| supabase/tests | Database permission and ledger regression checks |
| docs/ARCHITECTURE.md | Trust boundaries and migration scope |
| docs/REMEDIATION-2026-11.md | Report findings, evidence and outstanding work |

The SQL files are not a complete database baseline. A fresh Supabase deployment still requires the existing schema and Edge Functions to be exported, reviewed and versioned. Do not run production-specific ledger or mutation tests against live customer accounts.

## Dependency and code checks

```sh
npm audit
npm audit --prefix web
npm run verify:production
npm run format
```

The root manifest overrides `compression` and `minimatch` to patched versions for development tooling. Review overrides when updating their parent packages. Go uses only the standard library, so there is no `go.sum`. Angular compiles with strict TypeScript and template checks. Frontend linting checks legacy scripts too; unused-variable warnings are disabled for the existing code during migration.

## Licensing

Private/proprietary (`UNLICENSED`). No rights have been transferred and no DataFactor agreement has been accepted. Passing tests does not guarantee a licensing offer or a specific review score.

## Run with Docker

```sh
docker build -t kryptopesa-api .
docker compose up --build -d
curl -i http://127.0.0.1:8080/healthz
# 200 {"status":"ok"}; liveness only, not upstream readiness.
curl -i http://127.0.0.1:8080/api/account
# 401 {"error":"unauthorized"}
curl -i -H 'Authorization: Bearer local-test-token' http://127.0.0.1:8080/api/account
# 200 {"username":"Local fixture","account_status":"active","kyc_status":"pending"}
docker compose down
```

Compose requires no external accounts or credentials. It runs the real Go account handler against a small HTTP Auth/profile fixture. The mock shares the API network namespace and listens only on loopback; only API port 8080 is published, bound to localhost. The explicit `-local-upstream` development flag accepts only loopback IP origins and the fixture key. The production Vercel adapter still requires a Supabase HTTPS origin and cannot enable this flag.

This environment exercises the read-only account service, not full Supabase Auth sign-up, RLS, KYC, custody or M-Pesa payouts. Those integrations remain outside this fixture. The mock implements only the two endpoints consumed by the Go API and must never be used for real credentials or financial transactions.

Without Docker, run `node scripts/mock-supabase.cjs` in one terminal and `PUBLIC_SUPABASE_URL=http://127.0.0.1:8081 PUBLIC_SUPABASE_ANON_KEY=local-fixture-key go run ./cmd/server -local-upstream` in another.

## Operational checks and development workflow

The standalone server writes JSON structured logs using `log/slog`. Upstream events include route path, status and duration; rejected requests include a stable error code and status. Logs exclude bearer tokens, API keys, query strings, personal data, response bodies and raw upstream errors. Vercel captures the same account events through its runtime logger. `/healthz` belongs to the standalone server. `/api/health` provides liveness on both Vercel and the standalone server. Request middleware adds generated X-Request-ID values, status/latency logs and generic panic recovery.

Run `npm ci` and `npm ci --prefix web` before the root tests: homepage DOM tests reuse the Angular workspace's locked jsdom dependency. Tests cover KYC badges, unavailable balances/deposits, invalid market prices/rates, verification policy regressions and the mock's credential/owner checks. Go coverage includes the Vercel adapter, standalone server and account package. Explicit package paths avoid accidentally treating vendored JavaScript tooling's Go fixtures in `node_modules` as application code.

Keep behavior changes and their regression tests in the same focused commit. Do not create artificial history, tags or releases to inflate an assessment. `.env.example` documents optional `KP_SMOKE_ACCESS_TOKEN`, `TEST_DATABASE_URL` and `TEST_USER_ID`; these are shell-only test inputs and are never browser configuration. Production verification is read-only and skips authenticated checks unless an authorized token is supplied.

## Combined release and admin modules

The admin page loads separate helper, chart, UI and user modules with authorization and safe-rendering regression tests. `npm run test:coverage` enforces 80% line coverage for the explicitly scoped account guard, configuration and admin helper modules, not the entire frontend.

Docker now includes the built static and Angular UI alongside the API. The default `docker compose up --build` keeps the loopback Auth/profile fixture. Its static UI uses non-working fixture public configuration; it cannot sign in against that fixture. For manual staging UI sign-in use `docker compose -f compose.staging.yaml --env-file .env.local up --build` with a separate staging project's public configuration. The standalone static file server does not reproduce Vercel's response-header policies; verify those on Vercel.
