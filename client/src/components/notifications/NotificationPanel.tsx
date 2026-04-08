import { CheckCheck } from 'lucide-react';
import type { Notification } from '@pileo/shared';
import { useNotificationStore } from '../../stores/notification.store';
import { NotificationItem } from './NotificationItem';
import styles from './notification-panel.module.css';

interface NotificationPanelProps {
  onNavigate: (notification: Notification) => void;
}

export function NotificationPanel({ onNavigate }: NotificationPanelProps) {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotificationStore();

  const handleClick = (notification: Notification): void => {
    if (!notification.isRead) {
      markRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Notifications</span>
        {unreadCount > 0 && (
          <button className={styles.markAllButton} onClick={() => markAllRead()}>
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>No notifications yet</div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={handleClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
