# Compliance remediation register (2026-11-02)

Status: OPEN — this is an audit register, not a claim of legal compliance.

## Required controls
1. Privacy notice: inventory actual collection, lawful basis, retention, processors, transfers, rights and contact.
2. Terms: verify business identity, governing law, scope, liability and dispute handling.
3. Refunds: disclose eligibility, timing and process before payment.
4. Cookies: inventory actual cookies and trackers, publish accurate notice.
5. Consent: block non-essential trackers until valid opt-in where required; support withdrawal.
6. Forms: separate optional marketing consent from necessary processing; record consent.
7. Data minimization: remove unnecessary fields and define retention limits.
8. Third parties: inventory SDKs, contracts, permissions and data transfers.
9. UX: remove prechecked boxes, forced consent, confusing cancellation.
10. Pricing: disclose full costs before purchase.
11. Reviews: verify authenticity; never fabricate.
12. Claims: substantiate speed, security, availability and performance.
13. Images: meaningful alt text; decorative images use empty alt.
14. Accessibility: audit WCAG 2.2 AA contrast and focus indicators.
15. Keyboard: verify navigation, dialogs, forms and focus order.
16. Business details: verify legal name, jurisdiction and contact.
17. Minors: age gating and parental consent only as legally applicable; otherwise prohibit minors.
18. Marketing: unsubscribe and suppression handling.
19. Assets: verify commercial licenses and attribution.
20. Deletion: authenticated request flow, retention exceptions and confirmation.

## Release gates
- Verify actual source code, deployed build and environment configuration.
- Do not publish placeholder policies as final legal advice.
- Obtain Kenyan legal/privacy review; assess ODPC obligations.
- Test on staging, then review deployment diffs and logs.
- Do not represent controls as implemented until verified.

## KryptoPesa-specific blockers
- Verify VASP licensing/registration requirements and actual operating permissions before marketing live exchange services.
- Remove or substantiate 'instant', 'secure', 'KYC-verified' and other live-service claims where functionality is incomplete.
- Document Persona KYC controller/processor relationship, consent/notice, retention, data deletion limits and webhook signature verification.
- Disclose exchange rates, spreads, network fees, settlement delays, reversibility, fraud and custody risks.
- Enforce server-side authorization for admin/super-admin and protect wallet assignment and payouts.
- Treat KYC/AML retention obligations and legal holds as exceptions to deletion; never promise unconditional erasure.
