# ZAP report triage

The supplied report was generated on 14 November 2026 at 20:45:43. It records zero high, medium or low risk alerts and six informational alert types. Counts under individual alert types are occurrences, not six separate vulnerabilities. Every reported endpoint method is GET; the report does not establish authenticated authorization, database RLS, KYC or payout coverage. No new full ZAP scan was run for this change.

| Finding | Evidence and disposition |
| --- | --- |
| Sensitive information in URL / authentication request identified | Report URLs contain ZAP fixture credentials. Login, signup and recovery forms omitted the method attribute and therefore had a native GET fallback. Existing JavaScript calls preventDefault and uses Supabase Auth, but failure to attach a handler left the fallback exposed. Set all four forms to POST, block native submission with form-action 'none' in HTTP CSP and page metadata, and add no-referrer on account pages. SDK requests remain controlled by connect-src. |
| Re-examine Cache-control | A live read-only HEAD request to signup.html returned private, no-store and x-vercel-cache: MISS. Preserve this policy and test its configuration. A scanner alert alone is not evidence that personalized data was cached. |
| Retrieved from Cache | The shown example is the public HTTP www root. A live HEAD request to that URL returned a 308 redirect to HTTPS. The report does not include enough response evidence to identify a private-data leak. Public assets and redirects need not be made uncacheable solely to suppress this alert. |
| Suspicious comments | The current supabase-client.js comment describes generated browser-safe configuration. It contains no credential. Preserve useful documentation; no secret was identified in the supplied excerpt. |
| Modern Web Application | Technology detection, not a demonstrated vulnerability. |

Regression checks verify POST fallback, CSP and referrer policy for login/signup/password-recovery pages, and mocked login/signup submission without URL navigation. These DOM tests verify configuration and handlers, not a browser CSP engine or real Supabase sign-in. No customer credentials or mutation requests were used in live checks. The native fallback is intentionally unavailable when JavaScript is disabled; each form includes an explanatory noscript message.

These changes cannot remove credential-bearing requests already recorded in browser history or server/scanner logs. They do not prevent an external scanner from manually constructing arbitrary query strings. The report only shows synthetic ZAP values; it is not evidence that real passwords were exposed.
