import { MessageSquare, UserPlus, Clock, ArrowRight, AtSign } from 'lucide-react';
import type { Notification } from '@pileo/shared';
import styles from './notification-item.module.css';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function getIcon(type: Notification['type']) {
  switch (type) {
    case 'mention':
      return <AtSign size={16} />;
    case 'assignment':
      return <UserPlus size={16} />;
    case 'due_date':
      return <Clock size={16} />;
    case 'comment':
      return <MessageSquare size={16} />;
    case 'task_moved':
      return <ArrowRight size={16} />;
    default:
      return <MessageSquare size={16} />;
  }
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const className = [
    styles.item,
    notification.isRead ? '' : styles.unread,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={className} onClick={() => onClick(notification)}>
      <div className={styles.icon}>{getIcon(notification.type)}</div>
      <div className={styles.content}>
        <div className={styles.title}>{notification.title}</div>
        <div className={styles.message}>{notification.message}</div>
        <div className={styles.timestamp}>{formatTimestamp(notification.createdAt)}</div>
      </div>
      {!notification.isRead && <div className={styles.dot} />}
    </button>
  );
}
