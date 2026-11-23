import { env } from 'cloudflare:workers';
import { all } from './database';
import { findGuideBoss } from './boss-guide';

export async function privateTimerFeed(request: Request, path: string): Promise<Response | null> {
  if (path !== 'private-timer-feed') return null;

  const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  const secret = env.PRIVATE_TIMER_VIEW_TOKEN;
  const authorization = request.headers.get('authorization') || '';
  if (!secret || secret.length < 43 || !authorization.startsWith('Bearer ')) {
    return Response.json({ error: 'Not found.' }, { status: 404, headers });
  }

  const encoder = new TextEncoder();
  const [expected, received] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
    crypto.subtle.digest('SHA-256', encoder.encode(authorization.slice(7))),
  ]);
  const left = new Uint8Array(expected);
  const right = new Uint8Array(received);
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  if (difference !== 0) return Response.json({ error: 'Not found.' }, { status: 404, headers });
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { ...headers, Allow: 'GET' } });
  }

  const serverTime = Math.floor(Date.now() / 1000);
  const timers = await all<{
    revision: string; name: string; boss_id: string; game_channel: number; killed: number; respawns: number;
  }>(`SELECT t.revision, m.name, t.boss_id, t.game_channel, t.killed, t.respawns
      FROM boss_timers t JOIN members m ON m.id = t.member_id
      WHERE m.active = 1 AND t.respawns > ?
      ORDER BY t.respawns, m.name COLLATE NOCASE, t.game_channel`, serverTime);

  return Response.json({
    serverTime,
    timers: timers.map(timer => {
      const boss = findGuideBoss(timer.boss_id);
      return {
        key: timer.revision,
        player: timer.name,
        bossId: timer.boss_id,
        bossName: boss?.name || timer.boss_id,
        mapName: boss?.mapName || '',
        channel: timer.game_channel,
        killedAt: timer.killed,
        respawnsAt: timer.respawns,
      };
    }),
  }, { headers });
}
