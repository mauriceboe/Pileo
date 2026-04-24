import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Key } from 'lucide-react';
import * as apiKeysApi from '../../api/api-keys.api';
import type { ApiKeyPublic } from '../../api/api-keys.api';
import * as boardsApi from '../../api/boards.api';
import type { BoardWithColumns } from '../../api/boards.api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import styles from './api-access-settings.module.css';

interface ApiAccessSettingsProps {
  projectId: string;
}

export function ApiAccessSettings({ projectId }: ApiAccessSettingsProps) {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [boards, setBoards] = useState<BoardWithColumns[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiKeysApi.listApiKeys(projectId),
      boardsApi.listBoards(projectId).then(async (boardList) => {
        const detailed = await Promise.all(boardList.map((b) => boardsApi.getBoard(b.id)));
        return detailed;
      }),
    ])
      .then(([keyList, boardList]) => {
        setKeys(keyList);
        setBoards(boardList);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [projectId]);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setIsCreating(true);
    try {
      const result = await apiKeysApi.createApiKey(projectId, trimmed);
      setKeys((prev) => [...prev, result.key]);
      setNewlyCreatedKey(result.rawKey);
      setNewName('');
      setShowAdd(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!window.confirm('Revoke this API key? Any integrations using it will stop working.')) return;
    await apiKeysApi.revokeApiKey(keyId);
    setKeys((prev) => prev.filter((k) => k.id !== keyId));
    if (newlyCreatedKey) setNewlyCreatedKey(null);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  return (
    <div className={styles.container}>
      <p className={styles.description}>
        Generate API keys to integrate external tools like n8n with this project.
        Keys grant full member access to create and manage tasks.
      </p>

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className={styles.keyBanner}>
          <div className={styles.keyBannerHeader}>
            <Key size={16} />
            <strong>Save your API key now — it won't be shown again</strong>
          </div>
          <div className={styles.keyDisplay}>
            <code className={styles.keyCode}>{newlyCreatedKey}</code>
            <button
              className={styles.copyButton}
              onClick={() => copyToClipboard(newlyCreatedKey, 'new-key')}
              title="Copy to clipboard"
            >
              {copiedId === 'new-key' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      {keys.length > 0 && (
        <div className={styles.keyList}>
          {keys.map((key) => (
            <div key={key.id} className={styles.keyRow}>
              <div className={styles.keyInfo}>
                <span className={styles.keyName}>{key.name}</span>
                <code className={styles.keyPrefix}>{key.keyPrefix}</code>
              </div>
              <div className={styles.keyMeta}>
                <span className={styles.keyDate}>Created {formatDate(key.createdAt)}</span>
                {key.lastUsedAt && (
                  <span className={styles.keyDate}>Last used {formatDate(key.lastUsedAt)}</span>
                )}
              </div>
              <button
                className={styles.revokeButton}
                onClick={() => handleRevoke(key.id)}
                title="Revoke key"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add key form */}
      {showAdd ? (
        <div className={styles.addForm}>
          <Input
            label="Key Name"
            placeholder="e.g. n8n Integration"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className={styles.addActions}>
            <Button size="sm" onClick={handleCreate} loading={isCreating} disabled={!newName.trim()}>
              Generate Key
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewName(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Generate API Key
        </Button>
      )}

      {/* Column reference */}
      {boards.length > 0 && (
        <div className={styles.columnRef}>
          <h4 className={styles.columnRefTitle}>Column IDs for n8n</h4>
          <p className={styles.columnRefDescription}>
            Use these IDs in your n8n workflow to specify where new cards should be created.
          </p>
          {boards.map((board) => (
            <div key={board.id} className={styles.boardGroup}>
              <span className={styles.boardName}>{board.name}</span>
              <div className={styles.columnList}>
                {board.columns.map((col) => (
                  <div key={col.id} className={styles.columnRow}>
                    <span
                      className={styles.columnColor}
                      style={{ backgroundColor: col.color }}
                    />
                    <span className={styles.columnName}>{col.name}</span>
                    <code className={styles.columnId}>{col.id}</code>
                    <button
                      className={styles.copyButton}
                      onClick={() => copyToClipboard(col.id, col.id)}
                      title="Copy column ID"
                    >
                      {copiedId === col.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* API docs snippet */}
      {keys.length > 0 && (
        <div className={styles.docsSection}>
          <h4 className={styles.columnRefTitle}>API Usage (n8n HTTP Request)</h4>
          <div className={styles.docsBlock}>
            <div className={styles.docsHeader}>
              <span>Create a card</span>
              <button
                className={styles.copyButton}
                onClick={() => copyToClipboard(
                  `POST /api/v1/columns/{columnId}/tasks\nAuthorization: Bearer {your-api-key}\nContent-Type: application/json\n\n{"title": "Bug: Example", "description": "Details here"}`,
                  'docs-create'
                )}
                title="Copy"
              >
                {copiedId === 'docs-create' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <pre className={styles.codeBlock}>{`POST /api/v1/columns/{columnId}/tasks
Authorization: Bearer {your-api-key}
Content-Type: application/json

{"title": "Bug: Example", "description": "Details here"}`}</pre>
          </div>
          <div className={styles.docsBlock}>
            <div className={styles.docsHeader}>
              <span>Add a link to the card</span>
              <button
                className={styles.copyButton}
                onClick={() => copyToClipboard(
                  `POST /api/v1/tasks/{taskId}/links\nAuthorization: Bearer {your-api-key}\nContent-Type: application/json\n\n{"url": "https://github.com/owner/repo/issues/1"}`,
                  'docs-link'
                )}
                title="Copy"
              >
                {copiedId === 'docs-link' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <pre className={styles.codeBlock}>{`POST /api/v1/tasks/{taskId}/links
Authorization: Bearer {your-api-key}
Content-Type: application/json

{"url": "https://github.com/owner/repo/issues/1"}`}</pre>
          </div>
          <div className={styles.docsBlock}>
            <div className={styles.docsHeader}>
              <span>Set a label on the card</span>
              <button
                className={styles.copyButton}
                onClick={() => copyToClipboard(
                  `PATCH /api/v1/tasks/{taskId}/labels\nAuthorization: Bearer {your-api-key}\nContent-Type: application/json\n\n{"add": ["{labelId}"], "remove": []}`,
                  'docs-label'
                )}
                title="Copy"
              >
                {copiedId === 'docs-label' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            <pre className={styles.codeBlock}>{`PATCH /api/v1/tasks/{taskId}/labels
Authorization: Bearer {your-api-key}
Content-Type: application/json

{"add": ["{labelId}"], "remove": []}`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
