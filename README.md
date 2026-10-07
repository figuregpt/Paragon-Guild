# Paragon Guild

Source for the Paragon guild web app and installable PWA at [paragonguild.xyz](https://paragonguild.xyz/). The current application is written in English for Arthion, with a dark silver/crimson guild theme.

This initial source snapshot is based on deployment source commit `20a1817`. Runtime credentials, member/payment records, uploaded screenshots and local development history are not included. Documentation, example configuration and developer test paths have been prepared for public use; the application and financial logic are the deployed implementation.

## Features

- Home: weekly Yang contribution quest, ongoing/upcoming events and auctions.
- How to Use: a public step-by-step guide at `/how-to-use`, linked from every screen and the sign-in gateway. Covers phone installation, notifications, reminders, PP, contributions, events, auctions and administrator workflows without fetching private guild data.
- Discord sign-in: server nickname, class roles, guild membership, organizer roles and administrator allowlists are enforced on the server. A connected bot follows membership/role changes; OAuth verification is the fallback.
- Participation Points: immutable transaction history, available and reserved balances, and administrator Add PP / Remove PP adjustments with a reason and audit record. Deductions cannot consume auction reservations or make available PP negative.
- Auctions: only administrators create them, using an item name and screenshot. Bids reserve PP. Outbidding or cancellation releases reservations; settlement deducts PP from the winner once.
- Events: Help (25 PP), PvE (35 PP), PvP (75 PP), World Boss (100 PP). Help starts immediately and is limited to two creations per guild day; other types require organizer access. Locations include maps through Grotto of Exile and CH-1–CH-6.
- Attendance: the creator uploads mandatory screenshot evidence, selects confirmed participants, and submits for administrator review. Administrators select individual recipients; the creator and selected confirmed participants receive the event reward once.
- Contributions: a configured guild spreadsheet is checked server-side every five minutes. Weekly Deposit Log entries verify the 500,000 Yang quest and award its PP once; profiles show recorded deposit history.
- Notifications: optional Web Push, event reminders and Discord event cards with a location/channel and an Open Event link. Dates display in the viewer's timezone.
- Local trial: optional isolated member/leader demo databases with fictional characters. Production uses `MEMBERS_ONLY=true`, which disables all demo/preview entry points even if demo mode is accidentally enabled.

## Run locally

Use Node.js 24 and npm. SQLite uses Node's built-in `node:sqlite` module.

```sh
npm ci
cp .env.example .env.local
```

Set `SESSION_SECRET` to a random value in `.env.local`, for example the output of:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Keep the example loopback `APP_ORIGIN`, `PORT=3107`, `PARAGON_RUNTIME=railway`, and `DEMO_ENABLED=true` for a local review. Build and run the Node adapter:

```sh
node --env-file=.env.local scripts/run-framework.mjs build
node --env-file=.env.local scripts/railway-start.mjs
```

Open `http://127.0.0.1:3107/` and choose **Try as Guild Member** or **Try as Guild Leader**. Database migrations run automatically on startup. Real Discord, spreadsheet and notification settings can remain empty when reviewing the isolated demo.

The source also retains the optional Cloudflare/Sites adapter. `.openai/hosting.json` contains an unconfigured project placeholder; provision your own project and bindings before using it.

## Production deployment

`Dockerfile` builds the Node/Railway adapter. Configure variables on the hosting service, attach a persistent `/data` volume, and route the domain to the app's `PORT` (3000 by default).

- Set `APP_ORIGIN` to your exact HTTPS domain.
- Register `APP_ORIGIN/auth/discord/callback` in Discord Developer Portal.
- Configure guild/member/class roles and administrator/organizer allowlists. See [DISCORD_SETUP.md](DISCORD_SETUP.md).
- Set `SESSION_SECRET`; add bot, spreadsheet and Web Push settings only as needed.
- The Railway launcher runs protected jobs once per minute when `SCHEDULER_ENABLED=true` and `SCHEDULER_SECRET` is configured. Other hosts must schedule `POST /api/jobs/tick` with the scheduler bearer secret themselves.
- Keep one application replica when using the single SQLite volume. Whole migration files, checksums, transactional batches and SQLite triggers are preserved.

## Verification

Pure Node tests use the repository migrations and isolated data:

```sh
node node_modules/typescript/bin/tsc --noEmit
node tests/ledger.mjs
node tests/railway-storage.mjs
node tests/demo-isolation.mjs
node --experimental-vm-modules tests/member-page.mjs
node --experimental-vm-modules tests/discord-session.mjs
node tests/discord-bot.mjs
node tests/discord-event-cards.mjs
node tests/web-push.mjs
node tests/notification-delivery.mjs
node --experimental-vm-modules tests/contributions.mjs
```

For browser/API checks, install the optional test tooling and Chromium:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
TEST_BASE_URL=http://127.0.0.1:3107 node tests/admin-points-review.mjs
TEST_BASE_URL=http://127.0.0.1:3107 node tests/auction-finances.mjs
TEST_BASE_URL=http://127.0.0.1:3107 node tests/member-events-ui.mjs
TEST_BASE_URL=http://127.0.0.1:3107 node tests/event-channels.mjs
TEST_BASE_URL=http://127.0.0.1:3107 node tests/mobile-notifications-ui.mjs
```

Run mutating tests against the isolated local demo. The auction settlement time-control test refuses non-loopback hosts. Browser tests accept `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when a custom Chromium installation is needed. Screenshots are written to the OS temporary directory.

Some older browser scripts document previous HUD, treasury or catalogue interfaces and are historical checks rather than tests for the current UI. A physical installed iPhone is still needed to verify real iOS push delivery; browser/provider mocks do not prove delivery to a phone.

## Review the source

[SECURITY.md](SECURITY.md) maps authentication, access checks, PP accounting, screenshot storage, demo isolation and background jobs to the corresponding files. Sharing source enables inspection; it is not an independent security audit or proof of the production host's runtime configuration.

Yang and item transfers happen in game. This website records contributions and PP; it does not move in-game currency or items. Game artwork and third-party dependencies retain their respective owners' rights and license notices.

## Guild roster and opening PP

The bot imports every human account with the configured guild member role, including players who have never signed in. The admin PP panel can adjust their balances immediately. Gateway role changes invalidate the roster cache; a complete refresh also runs every five minutes. Removed members lose access and sessions, while their financial history remains intact.

Historical contribution totals are frozen when an operator resets the database, at 20 PP per 500,000 Yang (integer PP rounded down). Each source character and Discord account can receive the opening credit only once. Exact character names in slash-separated nicknames are supported; ambiguous or misspelled names require an explicit server-side mapping. Current-week amounts already included in the opening credit cannot earn the same quest PP again. Members not currently in the guild retain a pending source balance.

A reset requires maintenance mode, creates a complete SQLite backup, archives previous uploads, rebuilds the schema, and checks all opening totals before replacing the live database. There is no reset HTTP endpoint. Real payment snapshots and database backups are never committed here.

Production uses `MEMBERS_ONLY=true` and `DEMO_ENABLED=false`. The server verifies the current Discord Member role before rendering the application, including direct view links; visitors see the Discord sign-in gateway, with a link to the public `/how-to-use` guide. HTML is private and uncached. Missing member-role configuration fails closed, and administrators also require the Member role.

The Member role is the access requirement. Accounts whose class has not been assigned yet appear as `Unassigned` and can still enter; class roles do not grant administrator or organizer permissions.
