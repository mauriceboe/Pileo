import { useEffect, useState } from 'react';
import { Plus, Trash2, Copy, Check, ShieldAlert, Plug } from 'lucide-react';
import * as oauthApi from '../../api/oauth.api';
import type { OAuthClient } from '../../api/oauth.api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import styles from './connected-applications.module.css';

type ClientType = 'public' | 'confidential';

export function ConnectedApplications() {
  const [clients, setClients] = useState<OAuthClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [redirect, setRedirect] = useState('');
  const [type, setType] = useState<ClientType>('public');
  const [isCreating, setIsCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<{ clientId: string; secret: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    oauthApi
      .listOAuthClients()
      .then((rows) => setClients(rows))
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  const resetForm = () => {
    setShowAdd(false);
    setName('');
    setRedirect('');
    setType('public');
    setError(null);
  };

  const handleCreate = async () => {
    const n = name.trim();
    const r = redirect.trim();
    if (!n || !r) return;
    setIsCreating(true);
    setError(null);
    try {
      const result = await oauthApi.registerOAuthClient({
        name: n,
        redirectUris: [r],
        isPublic: type === 'public',
      });
      setClients((prev) => [result.client, ...prev]);
      if (result.clientSecret) {
        setNewSecret({ clientId: result.client.id, secret: result.clientSecret });
      }
      resetForm();
    } catch (e) {
      setError((e as Error).message || 'Could not register');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Disconnect "${clientName}"?`)) return;
    await oauthApi.revokeOAuthClient(clientId);
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    if (newSecret?.clientId === clientId) setNewSecret(null);
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const initial = (n: string) => n.trim().slice(0, 1).toUpperCase() || '?';
  const formatRelative = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const day = 86_400_000;
    if (ms < day) return 'today';
    if (ms < 2 * day) return 'yesterday';
    if (ms < 30 * day) return `${Math.floor(ms / day)} days ago`;
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return <div className={styles.skeleton} aria-hidden />;
  }

  // ---- Newly issued secret banner --------------------------------------
  const banner = newSecret && (
    <div className={styles.secretBanner}>
      <div className={styles.secretHeader}>
        <ShieldAlert size={14} />
        <span>Save the client secret — it won&apos;t be shown again.</span>
      </div>
      <SecretRow label="Client ID" value={newSecret.clientId} copyId="new-id" copiedId={copiedId} onCopy={copy} />
      <SecretRow label="Client secret" value={newSecret.secret} copyId="new-secret" copiedId={copiedId} onCopy={copy} />
    </div>
  );

  // ---- Add form --------------------------------------------------------
  const addForm = showAdd && (
    <div className={styles.addForm}>
      <Input
        label="Application name"
        placeholder="Claude.ai"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Redirect URI"
        placeholder="https://claude.ai/api/mcp/auth_callback"
        value={redirect}
        onChange={(e) => setRedirect(e.target.value)}
      />
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Type</span>
        <div className={styles.segmented} role="tablist">
          <button
            role="tab"
            aria-selected={type === 'public'}
            className={`${styles.segment} ${type === 'public' ? styles.segmentActive : ''}`}
            onClick={() => setType('public')}
          >
            Public
          </button>
          <button
            role="tab"
            aria-selected={type === 'confidential'}
            className={`${styles.segment} ${type === 'confidential' ? styles.segmentActive : ''}`}
            onClick={() => setType('confidential')}
          >
            Confidential
          </button>
        </div>
        <p className={styles.fieldHint}>
          {type === 'public'
            ? 'PKCE-only. Best for browser apps like Claude.ai.'
            : 'Issues a client secret. For trusted server-side integrations.'}
        </p>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
        <Button
          size="sm"
          onClick={handleCreate}
          loading={isCreating}
          disabled={!name.trim() || !redirect.trim()}
        >
          Register
        </Button>
      </div>
    </div>
  );

  // ---- Empty state -----------------------------------------------------
  if (clients.length === 0 && !showAdd && !banner) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}><Plug size={18} /></div>
        <p className={styles.emptyTitle}>No connected applications</p>
        <p className={styles.emptyHint}>Let Claude.ai or other OAuth clients access this workspace.</p>
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Connect application
        </Button>
      </div>
    );
  }

  // ---- Default state ---------------------------------------------------
  return (
    <div className={styles.container}>
      {banner}
      {clients.length > 0 && (
        <ul className={styles.list}>
          {clients.map((c) => (
            <li key={c.id} className={styles.row}>
              <div className={styles.avatar} aria-hidden>{initial(c.name)}</div>
              <div className={styles.info}>
                <div className={styles.rowTop}>
                  <span className={styles.name}>{c.name}</span>
                  <span className={`${styles.badge} ${c.isPublic ? styles.badgePublic : styles.badgeConfidential}`}>
                    {c.isPublic ? 'Public' : 'Confidential'}
                  </span>
                </div>
                <span className={styles.meta}>Connected {formatRelative(c.createdAt)}</span>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => handleRevoke(c.id, c.name)}
                aria-label={`Disconnect ${c.name}`}
                title="Disconnect"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {addForm}
      {!showAdd && (
        <button className={styles.addButton} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Connect application
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

interface SecretRowProps {
  label: string;
  value: string;
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}
function SecretRow({ label, value, copyId, copiedId, onCopy }: SecretRowProps) {
  return (
    <div className={styles.secretRow}>
      <span className={styles.secretLabel}>{label}</span>
      <code className={styles.secretValue}>{value}</code>
      <button
        className={styles.iconButton}
        onClick={() => onCopy(value, copyId)}
        aria-label={`Copy ${label}`}
      >
        {copiedId === copyId ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}
