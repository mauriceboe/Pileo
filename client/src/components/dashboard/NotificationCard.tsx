import { AtSign, UserPlus, MessageSquare, Bell } from 'lucide-react';
import type { ReactNode } from 'react';
import { timeAgo } from '../../utils/time-format';
import styles from '../../pages/dashboard-page.module.css';

interface NotificationLike {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
}

const ICON_BY_TYPE: Record<string, ReactNode> = {
  mention: <AtSign size={16} />,
  assignment: <UserPlus size={16} />,
  comment: <MessageSquare size={16} />,
};

const ICON_CLASS_BY_TYPE: Record<string, string | undefined> = {
  mention: styles.notifIconMention,
  assignment: styles.notifIconAssignment,
  comment: styles.notifIconComment,
};

interface NotificationCardProps {
  notification: NotificationLike;
  onClick: (notification: NotificationLike) => void;
}

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  return (
    <button
      className={`${styles.notifCard} ${!notification.isRead ? styles.notifUnread : ''}`}
      onClick={() => onClick(notification)}
    >
      <div className={`${styles.notifIcon} ${ICON_CLASS_BY_TYPE[notification.type] ?? ''}`}>
        {ICON_BY_TYPE[notification.type] ?? <Bell size={16} />}
      </div>
      <div className={styles.notifBody}>
        <span className={styles.notifTime}>{timeAgo(notification.createdAt)}</span>
        <span className={styles.notifTitle}>
          <span className={styles.notifTitleBold}>{notification.title}</span>
        </span>
        {notification.message && (
          <div className={styles.notifMessage}>{notification.message}</div>
        )}
      </div>
    </button>
  );
}
