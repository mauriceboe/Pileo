import type { IncomingMessage } from 'node:http';
import { parse as parseCookie } from 'cookie';
import { unsign } from 'cookie-signature';
import { sqlite } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface SessionData {
  userId?: string;
}

function getSessionRow(sid: string, now: number): { sess: string } | undefined {
  return sqlite.prepare('SELECT sess FROM session WHERE sid = ? AND expired_at > ?').get(sid, now) as { sess: string } | undefined;
}

/**
 * Extract and validate session from the upgrade request cookie.
 * Returns the userId if the session is valid, or null otherwise.
 */
export function authenticateUpgrade(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    logger.debug('WebSocket upgrade: no cookie header');
    return null;
  }

  const cookies = parseCookie(cookieHeader);
  const rawSid = cookies['pileo.sid'];
  if (!rawSid) {
    logger.debug('WebSocket upgrade: no pileo.sid cookie');
    return null;
  }

  // express-session prefixes signed cookies with "s:"
  let sid: string;
  if (rawSid.startsWith('s:')) {
    const unsigned = unsign(rawSid.slice(2), env.PILEO_SESSION_SECRET);
    if (unsigned === false) {
      logger.debug('WebSocket upgrade: invalid cookie signature');
      return null;
    }
    sid = unsigned;
  } else {
    sid = rawSid;
  }

  try {
    const row = getSessionRow(sid, Date.now());
    if (!row) {
      logger.debug({ sid }, 'WebSocket upgrade: session not found or expired');
      return null;
    }

    const session = JSON.parse(row.sess) as SessionData;
    if (!session.userId) {
      logger.debug({ sid }, 'WebSocket upgrade: session has no userId');
      return null;
    }

    return session.userId;
  } catch (err) {
    logger.error({ err }, 'WebSocket upgrade: error reading session');
    return null;
  }
}
