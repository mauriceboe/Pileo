import { useState, useEffect } from 'react';
import { UserPlus, X, Crown, User as UserIcon, Link, Copy, Check, Trash2 } from 'lucide-react';
import { Dialog } from './Dialog';
import { Avatar } from './Avatar';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import { useBoardStore } from '../../stores/board.store';
import * as projectsApi from '../../api/projects.api';
import * as adminApi from '../../api/admin.api';
import * as shareApi from '../../api/share.api';
import type { ProjectMember, UserPublic } from '@pileo/shared';
import styles from './share-dialog.module.css';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const currentUser = useAuthStore((s) => s.user);
  const board = useBoardStore((s) => s.board);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserPublic[]>([]);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !selectedProject) return;
    projectsApi.listMembers(selectedProject.id).then(setMembers).catch(() => {});
    adminApi.listUsers().then(setAllUsers).catch(() => {});
  }, [open, selectedProject]);

  // Load existing share link
  useEffect(() => {
    if (!open || !board) return;
    setShareToken(null);
    shareApi.getShareLink(board.id).then((info) => {
      setShareToken(info?.token ?? null);
    }).catch(() => {});
  }, [open, board]);

  const memberIds = new Set(members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id) && u.id !== currentUser?.id);

  const handleAdd = async (userEmail: string) => {
    if (!selectedProject) return;
    setError('');
    setIsAdding(true);
    try {
      const member = await projectsApi.addMember(selectedProject.id, { email: userEmail, role: 'member' });
      setMembers((prev) => [...prev, member]);
    } catch (err: any) {
      setError(err?.message ?? 'Could not add user.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!selectedProject) return;
    try {
      await projectsApi.removeMember(selectedProject.id, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {}
  };

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const handleCreateLink = async () => {
    if (!board) return;
    setIsCreatingLink(true);
    try {
      const token = await shareApi.createShareLink(board.id);
      setShareToken(token);
    } catch {
      setError('Could not create share link.');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!board) return;
    try {
      await shareApi.deleteShareLink(board.id);
      setShareToken(null);
    } catch {}
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedProject) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Share Project">
      <div className={styles.content}>
        {error && <p className={styles.error}>{error}</p>}

        {/* Public share link */}
        {board && (
          <>
            <div className={styles.sectionLabel}>Public View-Only Link</div>
            {shareUrl ? (
              <div className={styles.shareLinkRow}>
                <div className={styles.shareLinkIcon}>
                  <Link size={14} />
                </div>
                <input
                  className={styles.shareLinkInput}
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button className={styles.shareLinkCopy} onClick={handleCopy} title="Copy link">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button className={styles.shareLinkDelete} onClick={handleDeleteLink} title="Remove link">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                className={styles.createLinkBtn}
                onClick={handleCreateLink}
                disabled={isCreatingLink}
              >
                <Link size={14} />
                {isCreatingLink ? 'Creating...' : 'Create public link'}
              </button>
            )}
            <p className={styles.shareLinkHint}>
              Anyone with this link can see the board columns and task titles. No details, no editing.
            </p>
          </>
        )}

        {/* Current members */}
        <div className={styles.sectionLabel}>Members</div>
        <div className={styles.memberList}>
          {members.map((m) => (
            <div key={m.userId} className={styles.memberRow}>
              <Avatar name={(m as any).user?.displayName ?? 'User'} src={(m as any).user?.avatarPath} size="sm" />
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{(m as any).user?.displayName ?? (m as any).user?.username ?? 'User'}</span>
                <span className={styles.memberEmail}>{(m as any).user?.email ?? ''}</span>
              </div>
              <span className={styles.memberRole}>
                {m.role === 'owner' ? <Crown size={12} /> : <UserIcon size={12} />}
                {m.role}
              </span>
              {m.role !== 'owner' ? (
                <button className={styles.removeBtn} onClick={() => handleRemove(m.userId)} title="Remove">
                  <X size={14} />
                </button>
              ) : (
                <span className={styles.removePlaceholder} />
              )}
            </div>
          ))}
        </div>

        {/* Add users */}
        {availableUsers.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Add Members</div>
            <div className={styles.memberList}>
              {availableUsers.map((u) => (
                <div key={u.id} className={styles.memberRow}>
                  <Avatar name={u.displayName} src={u.avatarPath} size="sm" />
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{u.displayName}</span>
                    <span className={styles.memberEmail}>{u.email}</span>
                  </div>
                  <button
                    className={styles.addBtn}
                    onClick={() => handleAdd(u.email)}
                    disabled={isAdding}
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {availableUsers.length === 0 && members.length > 0 && (
          <p className={styles.allAdded}>All users are already members.</p>
        )}
      </div>
    </Dialog>
  );
}
