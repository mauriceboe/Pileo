import session from 'express-session';
import { sqlite } from './database.js';
import { env } from './env.js';

// Simple SQLite-backed session store for express-session
class SqliteSessionStore extends session.Store {
  private readonly getStmt;
  private readonly setStmt;
  private readonly destroyStmt;
  private readonly clearStmt;
  private readonly lengthStmt;
  private readonly allStmt;
  private readonly touchStmt;

  constructor() {
    super();

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS session (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expired_at INTEGER NOT NULL
      )
    `);

    sqlite.exec(`
      CREATE INDEX IF NOT EXISTS session_expired_at_idx ON session (expired_at)
    `);

    this.getStmt = sqlite.prepare('SELECT sess FROM session WHERE sid = ? AND expired_at > ?');
    this.setStmt = sqlite.prepare('INSERT OR REPLACE INTO session (sid, sess, expired_at) VALUES (?, ?, ?)');
    this.destroyStmt = sqlite.prepare('DELETE FROM session WHERE sid = ?');
    this.clearStmt = sqlite.prepare('DELETE FROM session');
    this.lengthStmt = sqlite.prepare('SELECT COUNT(*) as count FROM session WHERE expired_at > ?');
    this.allStmt = sqlite.prepare('SELECT sess FROM session WHERE expired_at > ?');
    this.touchStmt = sqlite.prepare('UPDATE session SET expired_at = ? WHERE sid = ?');

    // Periodically clean expired sessions
    const cleanup = (): void => {
      sqlite.prepare('DELETE FROM session WHERE expired_at <= ?').run(Date.now());
    };
    const interval = setInterval(cleanup, 900000); // every 15 minutes
    interval.unref();
  }

  get(sid: string, callback: (err?: Error | null, session?: session.SessionData | null) => void): void {
    try {
      const row = this.getStmt.get(sid, Date.now()) as { sess: string } | undefined;
      if (!row) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.sess) as session.SessionData);
    } catch (err) {
      callback(err as Error);
    }
  }

  set(sid: string, sessionData: session.SessionData, callback?: (err?: Error | null) => void): void {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? env.PILEO_SESSION_MAX_AGE;
      const expiredAt = Date.now() + maxAge;
      this.setStmt.run(sid, JSON.stringify(sessionData), expiredAt);
      callback?.(null);
    } catch (err) {
      callback?.(err as Error);
    }
  }

  destroy(sid: string, callback?: (err?: Error | null) => void): void {
    try {
      this.destroyStmt.run(sid);
      callback?.(null);
    } catch (err) {
      callback?.(err as Error);
    }
  }

  clear(callback?: (err?: Error | null) => void): void {
    try {
      this.clearStmt.run();
      callback?.(null);
    } catch (err) {
      callback?.(err as Error);
    }
  }

  length(callback: (err?: Error | null, length?: number) => void): void {
    try {
      const row = this.lengthStmt.get(Date.now()) as { count: number };
      callback(null, row.count);
    } catch (err) {
      callback(err as Error);
    }
  }

  all(callback: (err?: Error | null, sessions?: session.SessionData[] | { [sid: string]: session.SessionData } | null) => void): void {
    try {
      const rows = this.allStmt.all(Date.now()) as Array<{ sess: string }>;
      const sessions = rows.map((row) => JSON.parse(row.sess) as session.SessionData);
      callback(null, sessions);
    } catch (err) {
      callback(err as Error);
    }
  }

  touch(sid: string, sessionData: session.SessionData, callback?: (err?: Error | null) => void): void {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? env.PILEO_SESSION_MAX_AGE;
      const expiredAt = Date.now() + maxAge;
      this.touchStmt.run(expiredAt, sid);
      callback?.(null);
    } catch (err) {
      callback?.(err as Error);
    }
  }
}

export function createSessionMiddleware(): ReturnType<typeof session> {
  return session({
    store: new SqliteSessionStore(),
    secret: env.PILEO_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'pileo.sid',
    cookie: {
      secure: env.PILEO_NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: env.PILEO_SESSION_MAX_AGE,
    },
  });
}
