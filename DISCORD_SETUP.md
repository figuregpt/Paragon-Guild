# Discord setup

1. Create a Discord application and configure server-side `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.
2. In OAuth2 redirects, register the exact `APP_ORIGIN/auth/discord/callback`. The app requests `identify guilds.members.read`; it never asks for your Discord password.
3. Set `DISCORD_GUILD_ID` and the required `DISCORD_MEMBER_ROLE_IDS`.
4. Map English class families to role IDs with `DISCORD_CLASS_ROLES`. Arrays allow several subclass roles in one family. Users must match exactly one supported class family.
5. Configure administrator access with `DISCORD_ADMIN_USER_IDS` / `DISCORD_ADMIN_ROLE_IDS`; organizer access with `DISCORD_EVENT_CREATOR_ROLE_IDS` / optional `DISCORD_EVENT_CREATOR_USER_IDS`. These are server-side allowlists, not nickname checks. Empty settings grant no such privileges.
6. For live membership/role updates, enable **Server Members Intent** in Developer Portal, invite the bot to your guild, and set `DISCORD_BOT_TOKEN` on the server. The implementation has no moderation or role-management commands.
7. To post event cards, set `DISCORD_EVENT_CHANNEL_ID`. Give the bot View Channel, Send Messages, Embed Links and Read Message History for that channel. Do not grant Administrator, Manage Roles, Kick Members or Ban Members.

Example class-role setting:

```json
{"Warrior":["WARRIOR_ROLE_ID"],"Ninja":["NINJA_ROLE_ID"],"Sura":["SURA_ROLE_ID"],"Shaman":["SHAMAN_ROLE_ID"]}
```

When the bot is connected, membership updates invalidate access checks. OAuth verification remains the fallback. Removed membership revokes access; temporary provider failures do not silently grant privileges. Credentials stay on the server and must never be committed.
