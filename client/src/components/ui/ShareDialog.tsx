import { useState, useEffect } from 'react';
import { UserPlus, X, Crown, User as UserIcon } from 'lucide-react';
import { Dialog } from './Dialog';
import { Avatar } from './Avatar';
import { useProjectStore } from '../../stores/project.store';
import { useAuthStore } from '../../stores/auth.store';
import * as projectsApi from '../../api/projects.api';
import * as adminApi from '../../api/admin.api';
import type { ProjectMember, UserPublic } from '@pileo/shared';
import styles from './share-dialog.module.css';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShareDialog({ open, onClose }: ShareDialogProps) {
  const selectedProject = useProjectStore((s) => s.selectedProject);
  const currentUser = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserPublic[]>([]);
  const [error, setError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!open || !selectedProject) return;
    projectsApi.listMembers(selectedProject.id).then(setMembers).catch(() => {});
    adminApi.listUsers().then(setAllUsers).catch(() => {});
  }, [open, selectedProject]);

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

  if (!selectedProject) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Share Project">
      <div className={styles.content}>
        {error && <p className={styles.error}>{error}</p>}

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
