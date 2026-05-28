import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, KeyRound, ShieldAlert } from 'lucide-react';
import * as oauthApi from '../../api/oauth.api';
import type { OAuthClient } from '../../api/oauth.api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import styles from './connected-applications.module.css';

export function ConnectedApplications() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRedirect, setNewRedirect] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; secret: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    oauthApi
      .listOAuthClients()
      .then((rows) => {
        setClients(rows);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const reset = () => {
    setShowAdd(false);
    setNewName('');
    setNewRedirect('');
    setIsConfidential(false);
    setError(null);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    const redirect = newRedirect.trim();
    if (!name || !redirect) return;
    setIsCreating(true);
    setError(null);
    try {
      const result = await oauthApi.registerOAuthClient({
        name,
        redirectUris: [redirect],
        isPublic: !isConfidential,
      });
      setClients((prev) => [result.client, ...prev]);
      if (result.clientSecret) {
        setNewSecret({ clientId: result.client.id, secret: result.clientSecret });
      }
      reset();
    } catch (e) {
      setError((e as Error).message || 'Failed to register client');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (clientId: string, name: string) => {
    if (!window.confirm(`Revoke "${name}"? Any active sessions for this integration will stop working.`)) return;
    await oauthApi.revokeOAuthClient(clientId);
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (newSecret?.clientId === clientId) setNewSecret(null);
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  if (isLoading) return <p className={styles.loading}>Loading…</p>;

  return (
    <div className={styles.container}>
      <p className={styles.description}>
        OAuth 2.1 clients can access your Pileo data on your behalf. Use this to connect
        third-party AI assistants (like Claude.ai) to your projects via MCP.
      </p>

      {newSecret && (
        <div className={styles.secretBanner}>
          <div className={styles.secretHeader}>
            <ShieldAlert size={16} />
            <strong>Save your client secret now — it won't be shown again</strong>
          </div>
          <div className={styles.secretRow}>
            <span className={styles.secretLabel}>Client ID</span>
            <code className={styles.secretValue}>{newSecret.clientId}</code>
            <button
              className={styles.copyButton}
              onClick={() => copy(newSecret.clientId, 'new-id')}
              title="Copy client ID"
            >
              {copiedId === 'new-id' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className={styles.secretRow}>
            <span className={styles.secretLabel}>Client secret</span>
            <code className={styles.secretValue}>{newSecret.secret}</code>
            <button
              className={styles.copyButton}
              onClick={() => copy(newSecret.secret, 'new-secret')}
              title="Copy client secret"
            >
              {copiedId === 'new-secret' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {clients.length > 0 && (
        <div className={styles.clientList}>
          {clients.map((c) => (
            <div key={c.id} className={styles.clientRow}>
              <div className={styles.clientIconWrap}>
                <KeyRound size={16} />
              </div>
              <div className={styles.clientInfo}>
                <span className={styles.clientName}>{c.name}</span>
                <span className={styles.clientMeta}>
                  {c.isPublic ? 'Public (PKCE)' : 'Confidential'} · Created {formatDate(c.createdAt)}
                </span>
                <code className={styles.clientUri}>{c.redirectUris[0]}</code>
              </div>
              <button
                className={styles.revokeButton}
                onClick={() => handleRevoke(c.id, c.name)}
                title="Revoke client"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div className={styles.addForm}>
          <Input
            label="Application name"
            placeholder="e.g. Claude.ai"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div>
            <Input
              label="Redirect URI"
              placeholder="https://claude.ai/api/mcp/auth_callback"
              value={newRedirect}
              onChange={(e) => setNewRedirect(e.target.value)}
            />
            <p className={styles.fieldHint}>
              Where Pileo will send the authorization code after the user approves.
            </p>
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
            />
            <span>
              <span className={styles.checkboxLabel}>Confidential client</span>
              <span className={styles.checkboxHint}>
                Issues a client_secret. Leave off for browser-based / public connectors (Claude.ai).
              </span>
            </span>
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.addActions}>
            <Button
              size="sm"
              onClick={handleCreate}
              loading={isCreating}
              disabled={!newName.trim() || !newRedirect.trim()}
            >
              Register application
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Connect an application
        </Button>
      )}

      <div className={styles.docsBlock}>
        <h4 className={styles.docsTitle}>Connect Claude.ai</h4>
        <ol className={styles.docsList}>
          <li>In Claude.ai, open <strong>Settings → Connectors → Add custom connector</strong>.</li>
          <li>Paste <code>{`${window.location.origin}/api/v1/mcp`}</code> as the MCP server URL.</li>
          <li>Claude registers itself automatically (Dynamic Client Registration). Then you'll be bounced here to approve.</li>
        </ol>
      </div>
    </div>
  );
}
