# KryptoPesa review remediation — 11 November 2026

Scope: the supplied ZAP report, DataFactor's earlier code-quality feedback, and the prior application security review. DataFactor's score described an older tree, so this document records current changes rather than claiming the old assessment still describes every file. No revised score, offer or licensing approval has been obtained.

## Changes implemented in source

| Finding | Change | Verification |
| --- | --- | --- |
| Missing anti-clickjacking policy | Response CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY` | Header configuration regression test; deployment check pending |
| Executable inline scripts | Page scripts externalized; exact hash for JSON-LD; `script-src-attr 'none'` | Every root HTML script reference and syntax checked |
| Wildcard cross-origin access | Canonical-origin ACAO response header | Regression test; deployment check pending |
| Missing MIME protection | `X-Content-Type-Options: nosniff` | Regression test |
| Cached response | Public assets may cache; authenticated shells/API marked private/no-store | Header and API tests; ZAP cache notice alone is informational |
| Dashboard accepted failed profile checks | Confirmed user and active profile required, with timeout and deny-on-error behavior | 10 account guard cases |
| Session controls not starting | Shared client explicitly assigned on `window` | Source repaired; real session-expiry browser test remains |
| Missing runnable tests/build | Root tests, Angular integration tests, Go API tests; explicit build commands | Local checks below |
| Broken package-publish CI | Push/PR validation workflow; no package publication | CI execution pending remote branch run |
| Hardcoded environment configuration | Build-generated public config, `.env.example`, missing/secret-key rejection | 8 configuration cases and clean fixture build |
| No backend architecture | Read-only Go account endpoint and Angular account page | Go authorization tests, Angular HTTP integration tests |
| Dependency reproducibility | Exact direct versions, two npm lockfiles, patched tooling overrides | Both npm audits report zero known vulnerabilities at this check |
| Documentation | README, architecture, boundaries and deployment instructions | Commands executed locally |
| KYC ownership query | Explicit user ID filter in addition to RLS | Schema and existing owner RLS inspected |

## Prepared database changes — NOT APPLIED

`supabase/migrations/20261111185000_restrict_reporting_and_index_foreign_keys.sql` removes Power BI's raw-table reads and future default grants, supplies aggregate account/KYC reporting views, and adds eight missing foreign-key indexes. `supabase/tests/reporting_permissions.sql` checks the intended boundary.

The Supabase apply operation returned an expired confirmation. It did not report success. Treat the database as unchanged until the migration is approved, applied and its permission tests pass. Existing Power BI datasets must change to the reporting views; raw queries will no longer work after application.

## Local validation

- 31 Node regression tests passed.
- 4 Angular integration tests passed; production bundle compiled with strict types/templates.
- Go race tests and vet passed. `pkg/account` statement coverage: 90.3%; executable adapters are not covered by those unit tests.
- ESLint and targeted Prettier checks passed.
- Root and Angular dependency audits reported zero known vulnerabilities. This is time-bound advisory evidence, not proof of absence of vulnerabilities.
- Static build excludes source, reports, tests, SQL and local environment files.

## Still required before resubmission / broader rollout

1. Verify hosted headers, script loading and routing; repeat the ZAP scan against the deployed commit, including authenticated routes where appropriate. This work does not claim a fresh ZAP clearance.
2. Exercise real user/admin sign-in, email confirmation/reset, logout/session expiry and KYC completion with authorized test accounts. Unit mocks do not establish provider end-to-end behavior.
3. Apply and verify the database migration. Review exposed SECURITY DEFINER RPCs with authenticated/non-admin tests; do not blanket-revoke functions used by the current admin UI.
4. Enable/check leaked-password protection where the Supabase plan supports it, admin MFA and edge abuse controls. These hosted controls are not changed by frontend code.
5. Export and version the complete existing database and Edge Function baseline. The included incremental migration cannot recreate the application database from an empty project.
6. Finish Angular route parity before calling this a full migration. The new `/next/` route is a staged account view, not a replacement for every product route.
7. Complete provider onboarding and signed-webhook/idempotency tests before enabling payouts or production KYC. Deposits remain out of scope and disabled.
8. Confirm legal entity/contact/retention statements with the owner rather than inventing them. No mailbox, license or regulatory approval is inferred from application code.
9. Submit the verified repository to DataFactor only under an explicitly approved licensing workflow. No score guarantee and no manufactured contribution history.
