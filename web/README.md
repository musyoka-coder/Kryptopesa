# Angular account page

Run `npm ci`, `npm test` and `npm run build` in this directory. The production build is packaged under `/next/` by the repository root's `npm run build:all` command.

This page shares the existing Supabase browser client, gets the current access token, and calls same-origin `/api/account`. It does not create an independent login store. Root `config.js`, the pinned Supabase SDK, and root `supabase-client.js` must be served alongside it. Use the root deployment workflow rather than opening this directory as a standalone static site.

Tests replace authentication with a deterministic test double and use Angular's HTTP testing backend. They never send tokens or mutate production accounts.
