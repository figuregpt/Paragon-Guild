# Security review map

This document describes the implementation for source review. It is not an independent audit or a guarantee that a deployment uses the intended configuration.

| Area | Source | Review points |
| --- | --- | --- |
| Discord OAuth and sessions | `app/auth/discord/`, `lib/auth.ts` | OAuth state/cookie validation; minimal `identify guilds.members.read` scopes; hashed session identifiers; AES-GCM encryption of stored OAuth credentials; HttpOnly/Secure/SameSite cookies; expiry and membership checks. |
| Roles and bot | `lib/discord-roles.ts`, `lib/railway/discord-bot.mjs` | Member/class gates, explicit administrator and organizer allowlists, Gateway membership updates, OAuth fallback, timeouts/rate limits; no kick/ban/member-management commands. |
| Request authorization | `app/page.tsx`, `app/guild-sign-in.tsx`, `app/api/[[...path]]/route.ts`, `lib/auth.ts` | Current Member role required before rendering application or serving private API data; uncached HTML; missing membership configuration fails closed; same-origin writes, protected evidence reads and scheduler authentication. |
| PP and auctions | `drizzle/*.sql`, `lib/admin-points.ts`, `lib/auction-create.ts` | Immutable ledger, transactions, reservation/balance constraints, idempotent requests, winner-only settlement, audited manual additions/deductions. |
| Event rewards | `lib/member-events.ts`, `drizzle/0010_individual_event_rewards.sql` | Screenshot requirement, owner attendance confirmation, individual administrator decisions, creator eligibility, frozen review state, one reward per approved recipient. |
| Uploads and persistence | `lib/member-events.ts`, `lib/auction-create.ts`, `lib/railway/storage.mjs` | PNG/JPEG/WebP signature and size validation, controlled object keys, protected evidence endpoints, persistent SQLite transactions. |
| Spreadsheet contributions | `lib/contributions.ts`, `lib/contribution-source.mjs` | Server-only source settings, five-minute checks, member/name matching and idempotent weekly rewards. |
| Push and Discord cards | `lib/jobs.ts`, `lib/web-push.ts`, `lib/discord-announcements.ts`, `lib/railway/event-card.mjs`, `public/sw.js` | Opt-in subscriptions, reminder scheduling, retries and stale-subscription cleanup; configured channel only, no mentions, durable announcement outbox. |
| Optional local demo | `lib/railway/storage.mjs`, `lib/railway/demo-seed.mjs` | Disabled by `MEMBERS_ONLY=true`, including existing demo sessions and local previews. When explicitly enabled for local review: separate opaque demo cookies, per-browser SQLite/buckets, AsyncLocalStorage isolation, expiry, no production keys/data or live notification delivery. |

Production databases, payment logs, uploaded evidence, credentials and private runtime configuration are deliberately absent from this repository. `.env.example` contains placeholders. Keep credentials in server variables, and never post tokens, evidence screenshots, member/payment data or exploit details in public issues.

If you find a potential issue, contact the repository owner privately before disclosing details publicly. No dedicated private reporting address is configured in this snapshot.

Historical PP and roster checks: `lib/historical-contributions.ts`, `lib/contribution-source.mjs`, `lib/guild-roster.ts`, `lib/railway/reset-database.mjs`, and migration `0013_contribution_opening_balances.sql`. Opening totals and claims are immutable; source names and recipient accounts are unique. Operator resets require maintenance mode and backups.

The `/how-to-use` route is an intentional public, static documentation page. It does not load guild state, inspect sessions or fetch private APIs. The application and every financial/event endpoint still require current Member access. A shared footer exposes the guide without adding an application tab.
