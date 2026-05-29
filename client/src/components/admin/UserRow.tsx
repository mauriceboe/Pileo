import { Shield, Trash2 } from 'lucide-react';
import type { UserPublic, UserRole } from '@pileo/shared';
import { USER_ROLES } from '@pileo/shared';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import styles from '../../pages/admin-page.module.css';

interface UserRowProps {
  user: UserPublic;
  isSelf: boolean;
  onRoleChange: (userId: string, role: UserRole) => void;
  onDelete: (user: UserPublic) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function UserRow({ user, isSelf, onRoleChange, onDelete }: UserRowProps) {
  return (
    <div className={styles.userRow}>
      <Avatar name={user.displayName} src={user.avatarPath} size="md" />
      <div className={styles.userInfo}>
        <div className={styles.userName}>
          {user.displayName}
          {isSelf && <span className={styles.selfBadge}>you</span>}
        </div>
        <div className={styles.userMeta}>
          <span className={styles.userEmail}>{user.email}</span>
          <span className={styles.metaSep}>·</span>
          <span>@{user.username}</span>
          <span className={styles.metaSep}>·</span>
          <span>{formatDate(user.createdAt)}</span>
        </div>
      </div>
      <div className={styles.userActions}>
        {isSelf ? (
          <Badge variant="primary">
            <Shield size={12} /> Admin
          </Badge>
        ) : (
          <>
            <select
              className={styles.roleSelect}
              value={user.role}
              onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
            >
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <button
              className={styles.deleteButton}
              onClick={() => onDelete(user)}
              aria-label={`Delete ${user.displayName}`}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
