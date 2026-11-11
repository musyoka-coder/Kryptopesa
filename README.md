# KryptoPesa

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
go test -race -cover ./api ./cmd/... ./pkg/...
# Export the two PUBLIC_SUPABASE_* values in your shell, then:
go run ./cmd/server
```

The local API binds to `127.0.0.1:8080` by default (`LISTEN_ADDR` overrides it). `npm start` serves static assets only; use Vercel development or a same-origin reverse proxy for the complete frontend/API flow. Do not send bearer tokens to an unrelated API origin.

`GET /api/account` accepts `Authorization: Bearer <access token>`. It validates the token through Supabase Auth, requires confirmed email, queries the validated user's profile using the same bearer token (preserving RLS), and requires `account_status = active`. It returns only `username`, `account_status`, and `kyc_status`. It does not accept an owner ID from the caller. Responses are never cached. Errors are generic and upstream calls have bounded durations and response sizes.

## Deployment

Vercel reads `vercel.json`, runs `npm ci && npm ci --prefix web`, builds static and Angular assets, and deploys `api/account.go` as a Go function. Production requires the two public Supabase environment variables. Preview builds should use a separate staging project; the remediation branch currently uses non-working fixture values. That preview cannot validate real account sign-in.

GitHub Actions runs frontend checks, Angular tests/build, Go vet and race tests on pushes and pull requests. It does not publish a package or submit anything for licensing. CI is secret-free.

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
npm run format
```

The root manifest overrides `compression` and `minimatch` to patched versions for development tooling. Review overrides when updating their parent packages. Go uses only the standard library, so there is no `go.sum`. Angular compiles with strict TypeScript and template checks. Frontend linting checks legacy scripts too; unused-variable warnings are disabled for the existing code during migration.

## Licensing

Private/proprietary (`UNLICENSED`). No rights have been transferred and no DataFactor agreement has been accepted. Passing tests does not guarantee a licensing offer or a specific review score.
