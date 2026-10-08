# Paragon Guild

Source for the Paragon guild web app and installable PWA at [paragonguild.xyz](https://paragonguild.xyz/). The current application is written in English for Arthion, with a dark silver/crimson guild theme.

This initial source snapshot is based on deployment source commit `20a1817`. Runtime credentials, member/payment records, uploaded screenshots and local development history are not included. Documentation, example configuration and developer test paths have been prepared for public use; the application and financial logic are the deployed implementation.

## Features

- Home: weekly Yang contribution quest, ongoing/upcoming events and auctions.
- How to Use: a public visual guide at `/how-to-use`, linked from every screen and the sign-in gateway. Eight topics show one illustrated step at a time, with Back/Next controls, direct topic/step links and 16 real UI screenshots using fictional accounts. Covers iPhone Home Screen setup, notifications, reminders, PP, contributions, events (including Demon Tower and Custom), auctions and administrator workflows. Images open at full resolution; no Chrome installation instructions or private guild data.
- Discord sign-in: server nickname, class roles, guild membership, organizer roles and administrator allowlists are enforced on the server. A connected bot follows membership/role changes; OAuth verification is the fallback.
- Participation Points: immutable transaction history, available and reserved balances, and administrator Add PP / Remove PP adjustments with a reason and audit record. Deductions cannot consume auction reservations or make available PP negative.
- Auctions: only administrators create them, using an item name and screenshot. Bids reserve PP. Outbidding or cancellation releases reservations; settlement deducts PP from the winner once.
- Events: Help (10 PP), Demon Tower (10 PP), PvE (35 PP), Open PvP (100 PP), Guild War (100 PP), World Boss (75 PP), and Custom (chosen PP). Help starts immediately and is limited to two creations per guild day. Every other type requires the Experienced Discord role, has a device-local start time and ends manually. Custom supports a title, CH-1–CH-6, a map or free-text location and 1–1,000,000 whole PP. Existing events retain their stored reward.
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
- Configure guild/member/class roles and administrator allowlists and Experienced role IDs. See [DISCORD_SETUP.md](DISCORD_SETUP.md).
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

Event policy checks: `node tests/event-policy-migration.mjs` verifies old rewards remain unchanged, new rewards and custom bounds are enforced in SQLite, and administrators cannot bypass the Experienced role. `TEST_BASE_URL=http://127.0.0.1:3107 node tests/experienced-events-ui.mjs` checks member/Experienced forms at mobile and desktop sizes, custom PP/location validation, device-local start times and manual ending.

Visual guide verification: `GUIDE_TEST_ORIGIN=http://127.0.0.1:3107 node tests/how-to-use.mjs` checks all 28 steps at 320/390/768/1440 px, all 16 screenshots, keyboard focus, direct links, browser back/reload, invalid hashes and zero private API requests. Use the Playwright setup above; `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing installation.

## Discord event and auction notifications

Configure `DISCORD_NOTIFICATION_CHANNELS` and `DISCORD_NOTIFICATION_ROLE_ID` as described in [DISCORD_SETUP.md](DISCORD_SETUP.md). One announcement per event/auction is edited as its state changes. Initial announcements and final result cards ping Member; final results also mention affected participants or the winning bidder. Intermediate edits are quiet. Event result values come from the immutable PP ledger, so per-person rejection and creator rewards are reflected correctly. Auction settlement still charges only the winner. The minute scheduler processes a transactional queue with leases, bounded retries and duplicate recovery. Demo data never sends Discord notifications.

Run `node tests/discord-event-cards.mjs` and `node tests/discord-card-delivery.mjs` to verify the notification workflow without any real Discord sends.

## Languages

The application and visual guide support English, Turkish and Greek. The native header picker remembers the choice on each device, synchronizes browser tabs and otherwise follows the browser’s language. UI copy, errors, maps, classes, dates, numbers, offline copy and device notification labels are localized. Player names, authored event/item titles, descriptions and administrator reasons remain unchanged. Discord channel cards keep a shared English format.

Translations live in `lib/translations.json`; all languages use the same API identifiers, rewards and membership checks. Guide screenshots in `public/guide/tr` and `public/guide/el` use fictional local demo accounts.

`node tests/i18n.mjs` checks translation coverage, interpolation, markup and notification language preferences. Run `TEST_BASE_URL=http://127.0.0.1:3190 node tests/i18n-ui.mjs` against an isolated demo server to verify all three languages at 320/390/1440 px, draft preservation, event creation, bids, admin adjustments and every guide step. The existing Playwright environment overrides apply.

## Optional event map markers

Event creators can expand “Mark Meeting Point” after choosing a map, click/tap a spot, use arrow keys to adjust it, or remove the marker. The saved spot is visible to all members in event details; during review/completion the map starts collapsed. Guild War Area offers five battle-map variants. Changing map/type/variant clears a stale marker; custom freeform locations remain usable without a marker.

40 unchanged original Wiki map images cover 36 map locations. `public/maps/SOURCES.md` and `lib/event-map-assets.json` record their provenance. Castle Gate is an NPC appearing in several areas: choose the actual map to place a marker. Positions are relative image coordinates, independent of device size, and do not claim to be in-game X/Y coordinates.

Migration `0016_event_map_pins.sql` adds three nullable columns without rebuilding tables or altering existing records/reward triggers. API validation checks the asset/location association, integer bounds and retry payload; SQLite triggers reject partial/out-of-range pins. `tests/event-map-pins.mjs` verifies assets and migration preservation; `tests/event-map-pins-ui.mjs` runs all 40 assets and three-language mobile/desktop pointer, keyboard, reset, retry and persistence flows against an isolated local demo server.
