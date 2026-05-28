import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export interface McpSession {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  userId: string;
  projectId: string;
  lastActivity: number;
}

const SESSION_TTL_MS = 60 * 60 * 1000; // 1h idle TTL
const MAX_SESSIONS_PER_USER = 20;
const SWEEP_INTERVAL_MS = 60 * 1000;

class McpSessionRegistry {
  private readonly sessions = new Map<string, McpSession>();
  private sweepHandle: NodeJS.Timeout | null = null;

  startSweeper(): void {
    if (this.sweepHandle) return;
    this.sweepHandle = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweepHandle.unref();
  }

  stopSweeper(): void {
    if (this.sweepHandle) {
      clearInterval(this.sweepHandle);
      this.sweepHandle = null;
    }
  }

  get(sid: string): McpSession | undefined {
    return this.sessions.get(sid);
  }

  add(sid: string, session: McpSession): void {
    this.sessions.set(sid, session);
  }

  delete(sid: string): void {
    const s = this.sessions.get(sid);
    if (!s) return;
    try { s.server.close(); } catch { /* swallow */ }
    try { s.transport.close(); } catch { /* swallow */ }
    this.sessions.delete(sid);
  }

  countForUser(userId: string): number {
    const cutoff = Date.now() - SESSION_TTL_MS;
    let n = 0;
    for (const s of this.sessions.values()) {
      if (s.userId === userId && s.lastActivity >= cutoff) n++;
    }
    return n;
  }

  size(): number {
    return this.sessions.size;
  }

  closeAll(): void {
    for (const sid of [...this.sessions.keys()]) this.delete(sid);
    this.stopSweeper();
  }

  private sweep(): void {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [sid, s] of this.sessions) {
      if (s.lastActivity < cutoff) this.delete(sid);
    }
  }
}

export const mcpSessions = new McpSessionRegistry();
export { SESSION_TTL_MS, MAX_SESSIONS_PER_USER };
