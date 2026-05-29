import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, ExternalLink, Trash2, Plus } from 'lucide-react';
import { listLinks, createLink, deleteLink, type TaskLink } from '../../api/links.api';
import { useBoardStore } from '../../stores/board.store';
import styles from './task-links.module.css';

interface TaskLinksProps {
  taskId: string;
}

export function TaskLinks({ taskId }: TaskLinksProps) {
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const board = useBoardStore((s) => s.board);
  const fetchTasks = useBoardStore((s) => s.fetchTasks);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await listLinks(taskId);
      setLinks(data);
    } catch {
      // Silently handle — component will show empty state
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const full = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    try {
      const link = await createLink(taskId, full);
      setLinks((prev) => [...prev, link]);
      setUrl('');
      setShowForm(false);
      if (board) fetchTasks(board.id);
    } catch {
      // Errors are surfaced as global API-client errors; the link form stays open
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      if (board) fetchTasks(board.id);
    } catch {
      // Errors are surfaced as global API-client errors; the link form stays open
    }
  };

  if (loading) return null;

  return (
    <div className={styles.container}>
      {links.map((link) => (
        <div key={link.id} className={styles.linkRow}>
          <Link size={13} className={styles.linkIcon} />
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.linkUrl}>
            {link.url}
          </a>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.openBtn} title="Open">
            <ExternalLink size={13} />
          </a>
          <button className={styles.deleteBtn} onClick={() => handleDelete(link.id)} title="Remove">
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {showForm ? (
        <div className={styles.form}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowForm(false); setUrl(''); }
            }}
            autoFocus
          />
          <button className={styles.addBtn} onClick={handleAdd} disabled={!url.trim()}>Add</button>
          <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setUrl(''); }}>Cancel</button>
        </div>
      ) : (
        <button className={styles.triggerBtn} onClick={() => setShowForm(true)}>
          <Plus size={13} /> Add link
        </button>
      )}
    </div>
  );
}
