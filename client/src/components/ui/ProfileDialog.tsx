import { User, Mail, Calendar, FolderKanban } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { Avatar } from './Avatar';
import { Dialog } from './Dialog';
import styles from './profile-dialog.module.css';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileDialog({ open, onClose }: ProfileDialogProps) {
  const user = useAuthStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  return (
    <Dialog open={open} onClose={onClose} title="Profile">
      <div className={styles.content}>
        {/* Avatar + name */}
        <div className={styles.header}>
          <Avatar name={user?.displayName ?? 'User'} src={user?.avatarPath} size="lg" />
          <div className={styles.identity}>
            <span className={styles.name}>{user?.displayName ?? 'User'}</span>
            <span className={styles.username}>@{user?.username}</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <FolderKanban size={14} className={styles.statIcon} />
            <span className={styles.statValue}>{projects.length}</span>
            <span className={styles.statLabel}>Projects</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Details */}
        <div className={styles.details}>
          <div className={styles.row}>
            <User size={15} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Name</span>
            <span className={styles.rowValue}>{user?.displayName ?? '—'}</span>
          </div>
          <div className={styles.row}>
            <Mail size={15} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user?.email ?? '—'}</span>
          </div>
          {memberSince && (
            <div className={styles.row}>
              <Calendar size={15} className={styles.rowIcon} />
              <span className={styles.rowLabel}>Joined</span>
              <span className={styles.rowValue}>{memberSince}</span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
