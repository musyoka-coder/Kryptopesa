# Contributing

KryptoPesa is a fintech web application, not a data engineering pipeline. Work on a branch from current `main`; keep each behavioral change and its regression tests in the same commit. Do not manufacture history or split a single working change into broken intermediate commits.

## Local checks

Install Node 24.x and the Go version in `go.mod`. Run `npm ci` and `npm ci --prefix web` before tests: the DOM integration tests reuse Angular's locked jsdom development dependency.

```sh
npm run lint
npm run format:check
npm run test:coverage
npm test --prefix web
PUBLIC_SUPABASE_URL=https://fixture.supabase.co PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ci_fixture npm run build:all
go vet ./api ./cmd/... ./pkg/...
go test -race -coverprofile=coverage.out ./api ./cmd/... ./pkg/...
node scripts/check-go-coverage.cjs coverage.out
npm audit --audit-level=high
npm audit --prefix web --audit-level=high
```

Coverage gates: 70% weighted Go statements across adapters, server and packages; 80% Node lines across `account-access.js`, `scripts/config.cjs`, and `admin-helpers.js`. The Node gate is deliberately scoped and is **not whole-frontend coverage**. DOM tests also execute real login, signup and admin scripts; their evaluated code is not included in that Node percentage. Expand measurement and regression tests as legacy modules are migrated. Angular tests run separately.

## Review and release

Include the problem, changed behavior, test evidence and deployment implications in each PR. Never lower a threshold just to make a failing change pass. Never log bearer tokens, raw URLs/query strings, request bodies, emails or KYC documents. Browser keys must remain publishable/anon keys; privileged secrets never belong in build arguments or browser bundles.

Before merging, check both GitHub Actions jobs and the intended Vercel project's preview. The repository has previously received a failing status from a second Vercel project (`kryptopesa-hem3`); investigate its configuration rather than suppressing its status. A production deployment succeeding does not prove another project is fixed.

Create a semantic-version release tag only after its exact commit passes CI and deployment verification. Include migrations and unresolved limitations in release notes. Do not claim production payment readiness while provider onboarding, webhook tests, or database approvals remain pending.

Database permission tests require the existing schema and an isolated staging database. Read each SQL script before executing it; ledger mutation tests must never run against customer accounts. No live credentials are required by CI.
