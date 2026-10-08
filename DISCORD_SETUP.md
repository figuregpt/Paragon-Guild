# Discord setup

1. Create a Discord application and configure server-side `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
2. In OAuth2 redirects, register the exact `APP_ORIGIN/auth/discord/callback`. The app requests `identify guilds.members.read`; it never asks for your Discord password.
3. Set `DISCORD_GUILD_ID` and the required `DISCORD_MEMBER_ROLE_IDS`.
4. Map English class families to role IDs with `DISCORD_CLASS_ROLES`. Arrays allow several subclass roles in one family. Users must match exactly one supported class family.
5. Configure administrator access with `DISCORD_ADMIN_USER_IDS` / `DISCORD_ADMIN_ROLE_IDS`; event creation access with the Experienced role ID in `DISCORD_EVENT_CREATOR_ROLE_IDS`. Administrator IDs and legacy creator-user allowlists do not bypass this role. These are server-side allowlists, not nickname checks. Empty settings grant no such privileges.
6. For live membership/role updates, enable **Server Members Intent** in Developer Portal, invite the bot to your guild, and set `DISCORD_BOT_TOKEN` on the server. The implementation has no moderation or role-management commands.
7. Configure `DISCORD_NOTIFICATION_CHANNELS` with the notification routes below, and set `DISCORD_NOTIFICATION_ROLE_ID` to the Member role ID. Give the bot View Channel, Send Messages, Embed Links and Read Message History in each target channel. To ping Member, make that role mentionable or grant the bot Mention Everyone in only those channels. The code permits mentions of the configured Member role and event participants only; it never uses `@everyone` or `@here`. Do not grant Administrator, Manage Roles, Kick Members or Ban Members.

Example class-role setting:

```json
{"Warrior":["WARRIOR_ROLE_ID"],"Ninja":["NINJA_ROLE_ID"],"Sura":["SURA_ROLE_ID"],"Shaman":["SHAMAN_ROLE_ID"]}
```

When the bot is connected, membership updates invalidate access checks. OAuth verification remains the fallback. Removed membership revokes access; temporary provider failures do not silently grant privileges. Credentials stay on the server and must never be committed.

## Event and auction channels

Set this server-only JSON with your actual channel IDs. PvE and Custom can share Help; Guild War and Open PvP can share a channel.

```json
{"Help":"HELP_CHANNEL_ID","Demon Tower":"DT_CHANNEL_ID","PvE":"HELP_CHANNEL_ID","PvP":"PVP_CHANNEL_ID","Guild War":"PVP_CHANNEL_ID","World Boss":"BOSS_CHANNEL_ID","Custom":"HELP_CHANNEL_ID","Auction":"AUCTION_CHANNEL_ID"}
```

The old `DISCORD_EVENT_CHANNEL_ID` remains a single-channel fallback for events if the JSON setting is absent. Invalid JSON or invalid IDs fail closed. Auctions require their own configured route.

Each event or auction has one editable announcement. Joins, attendance, review stages, highest bids and settlement update that card, usually within one scheduler minute. Upcoming events also refresh when their start time arrives. Card edits do not repeat role or user pings.

Initial announcements ping Member. A single final result card pings Member and the affected participants, shows their actual awarded PP (including the creator), and separates members receiving no PP. Results for more than 70 recipients are split into bounded pages. Cancellation/rejection awards no PP. Auction results mention the winner; the winner alone pays on closing, and cancellation releases reserved points.

Delivery records are committed with the event/auction transaction. Interrupted work uses a lease, bounded retries and stable nonces. The bot checks recent own cards to recover lost send responses; it may edit only its own messages in configured channels of the configured guild. Demo sessions cannot deliver Discord messages. Private event evidence stays private; auction screenshots are attached to their announcement without exposing the protected upload endpoint.

`tests/discord-event-cards.mjs` verifies routing, transactional delivery, lifecycle coalescing, individual approval, ledger results, retry/lease recovery, mentions, result pagination, start refresh and auction settlement using isolated SQLite. `tests/discord-card-delivery.mjs` verifies channel/guild restrictions, bot ownership, quiet updates and duplicate recovery using mocked Discord messages. Live test messages require separate explicit operator authorization.
