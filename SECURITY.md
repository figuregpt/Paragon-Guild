# Security review map

This document describes the implementation for source review. It is not an independent audit or a guarantee that a deployment uses the intended configuration.

| Area | Source | Review points |
| --- | --- | --- |
| Discord OAuth and sessions | `app/auth/discord/`, `lib/auth.ts` | OAuth state/cookie validation; minimal `identify guilds.members.read` scopes; hashed session identifiers; AES-GCM encryption of stored OAuth credentials; HttpOnly/Secure/SameSite cookies; expiry and membership checks. |
| Roles and bot | `lib/discord-roles.ts`, `lib/railway/discord-bot.mjs` | Member/class gates, explicit administrator and organizer allowlists, Gateway membership updates, OAuth fallback, timeouts/rate limits; no kick/ban/member-management commands. |
| Request authorization | `app/api/[[...path]]/route.ts`, `lib/auth.ts` | Same-origin writes, server-side access gates, protected evidence reads and scheduler authentication. |
| PP and auctions | `drizzle/*.sql`, `lib/admin-points.ts`, `lib/auction-create.ts` | Immutable ledger, transactions, reservation/balance constraints, idempotent requests, winner-only settlement, audited manual additions/deductions. |
| Event rewards | `lib/member-events.ts`, `drizzle/0010_individual_event_rewards.sql` | Screenshot requirement, owner attendance confirmation, individual administrator decisions, creator eligibility, frozen review state, one reward per approved recipient. |
| Uploads and persistence | `lib/member-events.ts`, `lib/auction-create.ts`, `lib/railway/storage.mjs` | PNG/JPEG/WebP signature and size validation, controlled object keys, protected evidence endpoints, persistent SQLite transactions. |
| Spreadsheet contributions | `lib/contributions.ts`, `lib/contribution-source.mjs` | Server-only source settings, five-minute checks, member/name matching and idempotent weekly rewards. |
| Push and Discord cards | `lib/jobs.ts`, `lib/web-push.ts`, `lib/discord-announcements.ts`, `lib/railway/event-card.mjs`, `public/sw.js` | Opt-in subscriptions, reminder scheduling, retries and stale-subscription cleanup; configured channel only, no mentions, durable announcement outbox. |
| Public demo | `lib/railway/storage.mjs`, `lib/railway/demo-seed.mjs` | Separate opaque demo cookies, per-browser SQLite/buckets, AsyncLocalStorage isolation, expiry, no production keys/data or live notification delivery. |

Production databases, payment logs, uploaded evidence, credentials and private runtime configuration are deliberately absent from this repository. `.env.example` contains placeholders. Keep credentials in server variables, and never post tokens, evidence screenshots, member/payment data or exploit details in public issues.

If you find a potential issue, contact the repository owner privately before disclosing details publicly. No dedicated private reporting address is configured in this snapshot.
