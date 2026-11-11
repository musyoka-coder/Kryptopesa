# Production release status — 11 November 2026

## Deployed and verified

The security release is live at https://www.kryptopesa.app. PR #1 was merged. The follow-up hardening commit is `491871d898404f7a11b0cc8d5288b9e779a075da`, deployed by Vercel as `dpl_FAaczmCdpoAY7Hz9vAfkdMvGG1Jh` (READY, production aliases assigned).

- Both executable scripts and styles are external. The response CSP contains no `unsafe-inline` or `unsafe-eval`; framing is denied and MIME sniffing is disabled. The external Google font dependency was removed from admin.
- Root, login, signup, dashboard, admin, legal, verification and Angular account routes passed hosted HTTP response-policy checks. Sensitive shells and the Go account API use `private, no-store`.
- Missing and invalid bearer tokens return application-generated JSON `401 unauthorized` from the live Go API. Public Supabase configuration is present and working; email auto-confirm is disabled.
- Browser checks: Angular renders and refreshes correctly; a signed-out dashboard visit redirects to login; the legal-page email-provider chooser opens and closes. No application CSP errors were observed. Browser-extension errors were unrelated to the application.
- Live database tests using a synthetic nonexistent authenticated identity could not read profiles or KYC cases and were rejected by admin user-listing/account-status/KYC-status functions. The test transaction rolled back. The replayable test is `supabase/tests/non_admin_access.sql`.
- The profile role only grants browser updates to username and wallet_address, not privileged account/KYC/admin fields.
- Payment controls were read back: `payouts_enabled = false`, `deposits_enabled = false`. The STK Edge Function source returns `not_activated` and does not call the payment provider. No funds were moved.
- 32 Node tests, 4 Angular integration tests, Go race/vet checks and builds passed locally. GitHub Verify KryptoPesa run `43085613033` passed on the hardening commit.

## Fresh ZAP result

ZAP 2.17.0 passively analyzed 15 captured unauthenticated production GET responses after deployment. It reported **zero high, medium or low alerts**. This is a bounded passive review, not a penetration test or authenticated end-to-end clearance.

The remaining informational alerts concern public caching, duplicate header/meta CSP, modern JavaScript application detection, and a false-positive comment match on the word “from” in a build-configuration comment. The machine-readable findings and scope are in `docs/audit/production-zap-2026-11-11.json`.

The first follow-up scan found inline-style and external-font integrity alerts. Both were fixed before the final capture and scan; the final report does not suppress them.

## Unresolved release gates

**This is a deployed, hardened non-transactional application. It is not cleared for real-money operations.**

| Gate | Current state | Required completion |
| --- | --- | --- |
| Reporting permissions | Raw profile access still exists for powerbi_reader. Supabase migration confirmation expired again. | Apply the prepared reporting/index migration and run reporting_permissions.sql. |
| Positive authenticated journey | No authorized test-user token or provider test identity was supplied. | Exercise confirmed login, recovery, session expiry, account read, admin MFA and KYC completion. |
| Live providers | KYC remains sandbox; deposits and payouts are disabled. | Complete provider onboarding and verify signed callbacks, idempotency and reconciliation before activation. |
| Hosted security controls | Leaked-password protection, edge abuse controls and full admin MFA were not changed in this release. | Verify/configure these in the owning services. |
| Secondary deployment | kryptopesa-hem3 reports failure; its project and deployment return not-found to the connected account. | Owner must resolve that project's access/configuration or remove its stale repository integration. Primary production is READY. |
| Full reproducibility | Existing SQL/Edge Function baseline is not fully versioned. | Export and review the existing backend before claiming clean-room database recreation. |
| Full Go/Angular migration | Only the read-only account slice is migrated. | Migrate remaining routes with parity tests; existing routes are still the production UI. |

The database migration is deliberately not marked complete, and its confirmation requirement has not been bypassed. It does not affect the deployed app's current account API, but it remains a security blocker for unrestricted production readiness.

## Repeat verification

`npm run verify:production` performs read-only hosted checks. With an authorized test user's token supplied through `KP_SMOKE_ACCESS_TOKEN`, it also checks the positive account response without printing personal data. Without that token the authenticated check explicitly reports SKIP.

For database verification run the committed SQL tests in their intended existing project. Do not use live customer credentials or activate payments to satisfy a smoke test. A fresh passive scan should capture the deployed responses and import the HAR into ZAP's passive scanner; no alerts should be suppressed to improve the result.

## Rollback

Vercel retains the earlier production deployments. Roll back to the previous known-good production deployment through the project deployment controls if a regression is confirmed, then verify domain alias and account access. Do not roll back by restoring raw reporting grants or enabling payments. No database schema change was applied during this release.
