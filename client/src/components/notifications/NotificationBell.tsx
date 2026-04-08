import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@pileo/shared';
import { useNotificationStore } from '../../stores/notification.store';
import { NotificationPanel } from './NotificationPanel';
import styles from './notification-bell.module.css';

const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { unreadCount, fetchNotifications } = useNotificationStore();

  // Fetch on mount and poll every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(() => {
      fetchNotifications();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNavigate = useCallback(
    (notification: Notification) => {
      setOpen(false);
      // Navigate based on resource type
      if (notification.resourceType === 'task') {
        // Tasks don't have a standalone page; navigate is best-effort
        navigate(`/`);
      } else if (notification.resourceType === 'project') {
        navigate(`/projects/${notification.resourceId}`);
      }
    },
    [navigate],
  );

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.button}
        onClick={() => setOpen((previous) => !previous)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onNavigate={handleNavigate} />}
    </div>
  );
}
