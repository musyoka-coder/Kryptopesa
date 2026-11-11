# Changelog

## Unreleased — assessment quality improvements

- Removed the duplicate internal account handler and tests; `pkg/account` is authoritative.
- Separated admin helpers, charts, reusable controls and user details from navigation/views.
- Added DOM regression tests for auth denial, signup validation and admin access; validated explorer links and safe text rendering.
- Added generated request IDs and structured, privacy-safe HTTP logs; errors can be correlated by status and request ID without exposing provider error bodies.
- Added `/api/health` liveness and tests for diagnostics, adapters and coverage enforcement.
- Added Node and Go coverage gates, dependency audit gates, weekly Dependabot updates, and container smoke checks.
- Added a non-root, read-only container setup serving frontend and API on the same origin.

This is not yet a tagged release. Deployment verification and outstanding production controls are tracked separately.

## Previous security remediation

Added strict deployment headers, validated browser configuration, allowlisted static packaging, a read-only authenticated Go API and staged Angular account UI. Deposits and payouts remain disabled. See `docs/PRODUCTION-READINESS.md` for verification limits.
