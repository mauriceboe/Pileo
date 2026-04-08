import { useWebSocketStore } from '../../stores/websocket.store';
import { useAuthStore } from '../../stores/auth.store';
import { Avatar } from '../ui/Avatar';
import styles from './board-presence.module.css';

export function BoardPresence() {
  const presenceUsers = useWebSocketStore((state) => state.presenceUsers);
  const currentUserId = useAuthStore((state) => state.user?.id);

  // Filter out current user from presence list
  const otherUsers = presenceUsers.filter((u) => u.userId !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.avatarList}>
        {otherUsers.map((user) => (
          <div
            key={user.userId}
            className={styles.avatarWrapper}
            title={user.displayName || user.username}
          >
            <Avatar
              src={user.avatarPath}
              name={user.displayName || user.username}
              size="sm"
            />
            <span className={styles.onlineDot} />
          </div>
        ))}
      </div>
      <span className={styles.label}>
        {otherUsers.length === 1
          ? `${otherUsers[0]?.displayName || otherUsers[0]?.username || 'Someone'} is here`
          : `${otherUsers.length} others here`}
      </span>
    </div>
  );
}
