<div align="center">

<h1>Pileo</h1>

A self-hosted, real-time collaborative kanban — projects, boards, tasks, AI built in.

<br />

<a href="https://hub.docker.com/r/mauriceboe/pileo"><img alt="Docker" src="https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge" /></a>
&nbsp;
<a href="https://github.com/mauriceboe/Pileo/releases"><img alt="Release" src="https://img.shields.io/github/v/release/mauriceboe/Pileo?include_prereleases&style=for-the-badge&label=Release&color=10B981" /></a>
&nbsp;
<a href="https://github.com/mauriceboe/Pileo/blob/master/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPL_v3-6B7280?style=for-the-badge" /></a>

<br /><br />

<a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPL_v3-6B7280?style=flat-square" /></a>
<a href="https://hub.docker.com/r/mauriceboe/pileo"><img alt="Docker Pulls" src="https://img.shields.io/docker/pulls/mauriceboe/pileo?style=flat-square&color=6B7280" /></a>
<a href="https://github.com/mauriceboe/Pileo"><img alt="Stars" src="https://img.shields.io/github/stars/mauriceboe/Pileo?style=flat-square&color=6B7280" /></a>

</div>

---

## What you get

<table>
<tr>
<td width="50%" valign="top">

#### 🗂 Projects & boards

- **Projects** group boards under one owner, with member roles and shareable link
- **Multiple boards per project** — track features, bugs, sprints, ideas independently
- **Drag & drop columns** — reorder columns with the grab handle, no save needed
- **Column rules** — mark a column "completed" or "rejected" so dropped tasks auto-update
- **Column icons + colours** — 40+ lucide icons; per-column accent colour
- **Read-only share links** — board snapshot for anyone with the URL, no account required

</td>
<td width="50%" valign="top">

#### ✅ Tasks

- **Inline editing** — title, description, due date, priority, assignees, labels
- **Rich-text descriptions** — TipTap editor, mentions, inline formatting
- **Checklists** — sub-task tracking with drag-reorder
- **Attachments** — files up to a configurable limit, streamed download
- **Links** — collect external URLs per task
- **Custom fields** — dropdown, text, checklist per project; show on card as badge
- **Bulk move + duplicate** — multi-select inside a column, then ship the whole batch
- **Markdown export** — copy any task (title + description + checklist + links) as Markdown

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### 👥 Collaboration

- **Real-time sync** — WebSocket. Task moves, comments, edits show up instantly
- **Live presence** — see who else is on the board, cursor positions, who's editing what
- **Comments + @mentions** — full thread per task, inline notifications
- **Members + roles** — invite by email, owner/admin/member
- **Notifications** — mention, assignment, comment events with read/unread state
- **Activity feed** — per-task timeline with semantic diffs (renames, status flips, label edits)

</td>
<td width="50%" valign="top">

#### 🤖 AI / MCP

- **Built-in MCP server** — OAuth 2.1 + PKCE authenticated
- **27 tools** — create projects, boards, tasks, labels, custom fields, assignees, comments, checklists
- **Open Dynamic Client Registration** — RFC 7591, no admin step required for AI connectors
- **Pileo is connectable from claude.ai out of the box** — point the connector at your URL
- **API keys** — programmatic access without OAuth, per-project scoping

</td>
</tr>
<tr>
<td width="50%" valign="top">

#### 🔒 Security

- **Session auth** — express-session with httpOnly cookies, behind any TLS proxy
- **OAuth 2.1** — full server (`/.well-known/oauth-authorization-server`), refresh tokens, RFC 8414 + 9728 discovery
- **OIDC SSO** — optional, hook into Authentik, Keycloak, Google, etc.
- **Secrets at rest** — argon2 hashed client secrets, sha256 hashed tokens
- **Rate limited** — share-token + login endpoints throttled
- **Container hardening** — read-only root FS, dropped capabilities, no privilege escalation in the shipped compose

</td>
<td width="50%" valign="top">

#### ⚙️ Admin & ops

- **Admin panel** — user management, role assignment, public-registration toggle
- **Per-project API keys** — create + revoke, prefix preview
- **Connected applications** — review and revoke OAuth clients from the settings dialog
- **Healthcheck endpoint** — `GET /api/health` returns version + status
- **Versioned releases** — every push to main bumps a single digit with rollover (`0.1.0 → … → 0.1.9 → 0.2.0`)
- **Auto-published images** — `mauriceboe/pileo:latest` + `:VERSION` on Docker Hub, multi-arch (amd64 + arm64)

</td>
</tr>
</table>

---

## Get started in 30 seconds

```bash
SESSION_SECRET=$(openssl rand -hex 32) docker run -d \
  -p 3003:3003 \
  -e PILEO_SESSION_SECRET=$SESSION_SECRET \
  -v ./data:/app/data -v ./uploads:/app/uploads \
  mauriceboe/pileo
```

Then open `http://localhost:3003` and sign up. The first registered user becomes the admin.

---

## Docker Compose (production)

<details>
<summary>Full compose example with secure defaults</summary>

```yaml
services:
  pileo:
    image: mauriceboe/pileo:latest
    container_name: pileo
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
    tmpfs:
      - /tmp:noexec,nosuid,size=64m
    ports:
      - "3003:3003"
    environment:
      - PILEO_NODE_ENV=production
      - PILEO_HOST=0.0.0.0
      - PILEO_PORT=3003
      - PILEO_SESSION_SECRET=${PILEO_SESSION_SECRET:?Generate with: openssl rand -hex 32}
      - PILEO_DB_PATH=/app/data/pileo.db
      - PILEO_UPLOAD_DIR=/app/data/uploads
      - TZ=${TZ:-UTC}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - PILEO_ALLOWED_ORIGINS=${PILEO_ALLOWED_ORIGINS:-}
      - PILEO_APP_URL=${PILEO_APP_URL:-}
      # Behind a TLS-terminating reverse proxy:
      # - PILEO_TRUST_PROXY=1
      # - PILEO_FORCE_HTTPS=true
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3003/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

Then:

```bash
echo "PILEO_SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d
```

**HTTPS notes:** `PILEO_FORCE_HTTPS=true` is optional — it adds a 301 redirect, HSTS, CSP `upgrade-insecure-requests`, and forces the secure cookie flag. Only use it behind a TLS-terminating reverse proxy. `PILEO_TRUST_PROXY=1` tells Express how many proxies sit in front so real client IPs and `X-Forwarded-Proto` work.

</details>

A pre-baked starting point is committed as [`compose.example.yml`](./compose.example.yml).

---

## Tech stack

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js_20-339933?style=flat-square&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=flat-square&logo=zod&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-FFB72B?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

- **Server** NestJS 11 on Node 20, single bootstrap, no legacy Express stack. `better-sqlite3` with Drizzle for typed DB access; the OAuth and settings tables use raw SQL where the JSON-in-TEXT model is more ergonomic. Real-time over `ws`. Logs through Pino. Auth via `express-session`; OAuth 2.1 + RFC 7591 dynamic registration for the MCP connector.
- **Client** React 19 + Vite 6, Zustand for global state, `react-hook-form` + `zodResolver` for forms, TipTap for rich text, `@dnd-kit` for drag-and-drop, `lucide-react` for icons. All forms validate against the same Zod schemas the server uses.
- **Shared** A single `@pileo/shared` package exports the Zod schemas + their inferred TypeScript types + the API-response shapes. The client and server both consume it — no schema drift between wire format and code.

<br />

## Architecture

```text
┌─────────────────┐            ┌──────────────────────┐
│   React 19 SPA  │  ──REST──> │  NestJS controllers  │
│   (Vite, Zustand)│  ──WS─────>│  + WebSocket server  │
└─────────────────┘            └──────────────────────┘
        │                              │
        └──────── @pileo/shared ───────┘
                    Zod schemas + response types
                              │
                  ┌───────────┴────────────┐
                  │  SQLite (better-sqlite3) │
                  └────────────────────────┘
```

- The **client** never duplicates a Zod schema. Every payload it sends is validated against a schema exported from `@pileo/shared`, every response is typed by the matching API-response shape from the same package.
- The **server** uses the same schemas in NestJS controllers via a `ZodValidationPipe`. Wire-contract errors come back in a consistent `{ error: { code, message, details } }` envelope.
- The **WebSocket layer** carries presence + reactive invalidations (`task.created`, `column.moved`, …). The client refetches the affected query rather than mutating local state from the message.

---

## MCP / AI integration

Pileo ships an authenticated [Model Context Protocol](https://modelcontextprotocol.io) endpoint. Any compliant client (claude.ai, Claude Code, the SDK) can:

1. Discover it via `/.well-known/oauth-authorization-server`
2. Auto-register as a public OAuth client (no admin approval)
3. Complete the PKCE flow with a Pileo-hosted consent page
4. Call any of the **27 tools** — projects, boards, tasks, labels, custom fields, members, checklists, comments

Example `.mcp.json` for Claude Code:

```json
{
  "mcpServers": {
    "pileo": {
      "type": "http",
      "url": "https://your-pileo.example.com/api/v1/mcp"
    }
  }
}
```

For server-side automation, mint a per-project API key in **Project Settings → API Access** and pass it as `Authorization: Bearer pil_...`.

---

## Versioning

Pileo uses a single-digit rollover scheme:

```
0.1.0 → 0.1.1 → … → 0.1.9 → 0.2.0
0.2.0 → … → 0.9.0 → 1.0.0
1.0.0 → 1.0.1 → …
```

Every push to `main` automatically bumps the patch (or rolls into minor / major as needed), commits the bump as `chore(release): vX.Y.Z`, tags the commit, and publishes `mauriceboe/pileo:X.Y.Z` + `:latest` to Docker Hub.

The local CLI for the same bump:

```bash
node scripts/bump-version.mjs
```

---

## Local development

```bash
# Install (workspaces: client, server, packages/shared)
npm install

# Run server (port 3000) and client (port 5173 with /api proxy)
npm run dev --workspace=@pileo/server
npm run dev --workspace=@pileo/client
```

Tests:

```bash
npm test --workspace=@pileo/server
npm test --workspace=@pileo/client
npm run test:coverage --workspace=@pileo/client
```

Build the production image locally:

```bash
docker build -t pileo:dev .
docker run --rm -p 3003:3003 -e PILEO_SESSION_SECRET=dev pileo:dev
```

---

## Contributing

Patches welcome. Please:

1. Run both test suites locally (`npm test` in each workspace)
2. Keep `@pileo/shared` schemas as the single source of truth — never define a Zod schema or API-response type inside `client/src` or `server/src`
3. Follow the existing prefix style for commit messages: `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `chore(...)`

Issues and discussions live on GitHub. For security reports, email instead of opening a public issue.

---

## License

[AGPL v3](./LICENSE) — same as TREK. Self-host, modify, deploy. If you run a modified version as a network service, share your changes.
