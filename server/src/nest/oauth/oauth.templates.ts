// HTML rendering for the OAuth consent + error pages. Inline strings
// instead of a template engine — the pages are tiny, self-contained,
// and rendered before any JS bundle loads so we want zero extra deps.

export interface ConsentContext {
  clientName: string;
  displayName: string;
  username: string;
  redirectUri: string;
  scopes: string[];
  formAction: string;
}

export function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

export function renderConsent(ctx: ConsentContext): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Authorize ${escapeHtml(ctx.clientName)} · Pileo</title>
<style>${consentStyles}</style>
</head>
<body>
<div class="wrap">
  <h1>Authorize <strong>${escapeHtml(ctx.clientName)}</strong></h1>
  <p>Signed in as <strong>${escapeHtml(ctx.displayName)}</strong> (@${escapeHtml(ctx.username)})</p>
  <p>This integration is requesting access to your Pileo data:</p>
  <ul>${ctx.scopes.map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join('')}</ul>
  <p>It will redirect to <code>${escapeHtml(ctx.redirectUri)}</code>.</p>
  <form method="POST" action="${escapeHtml(ctx.formAction)}">
    <div class="row">
      <button name="action" value="deny">Cancel</button>
      <button name="action" value="approve" class="primary">Authorize</button>
    </div>
  </form>
</div>
</body>
</html>`;
}

export function renderError(error: string, description: string): string {
  return `<!doctype html>
<html><body style="font:14px system-ui; padding: 24px; max-width: 480px;">
<h1 style="font-size:18px;">OAuth error</h1>
<p><strong>${escapeHtml(error)}</strong></p>
<p style="color:#64748b;">${escapeHtml(description)}</p>
</body></html>`;
}

const consentStyles = `
:root { color-scheme: light dark; --bg:#fff; --fg:#0f172a; --muted:#64748b; --border:#e2e8f0; --accent:#4F46E5; }
@media (prefers-color-scheme: dark) { :root { --bg:#0f172a; --fg:#f1f5f9; --muted:#94a3b8; --border:#1e293b; } }
html,body { margin:0; background:var(--bg); color:var(--fg); font:14px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
.wrap { max-width: 420px; margin: 8vh auto; padding: 24px; border:1px solid var(--border); border-radius: 12px; }
h1 { font-size: 18px; margin: 0 0 8px; }
p { color: var(--muted); line-height: 1.5; margin: 8px 0; }
ul { padding-left: 18px; color: var(--fg); }
.row { display:flex; gap:8px; margin-top: 24px; }
button { flex:1; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--fg); cursor: pointer; font: inherit; }
button.primary { background: var(--accent); color: white; border-color: transparent; }
code { background: rgba(127,127,127,0.12); padding: 2px 5px; border-radius: 4px; font-size: 12px; }
`;
