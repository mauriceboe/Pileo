import { type ReactNode } from 'react';
import { Bell, ListChecks, CheckCircle2, Inbox } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import type { UserTask } from '../../api/stats.api';
import { useNotificationStore } from '../../stores/notification.store';
import { useOpenTaskInContext } from '../../hooks/useOpenTaskInContext';
import { NotificationCard } from './NotificationCard';
import { TaskItem } from './TaskItem';
import styles from '../../pages/dashboard-page.module.css';

export type WidgetView = 'notifications' | 'tasks' | 'completed' | 'inprogress';

const WIDGET_CONFIG: Record<WidgetView, { title: string; icon: ReactNode }> = {
  notifications: { title: 'Notifications', icon: <Bell size={18} /> },
  tasks: { title: 'My Tasks', icon: <ListChecks size={18} /> },
  completed: { title: 'Completed', icon: <CheckCircle2 size={18} /> },
  inprogress: { title: 'In Progress', icon: <Inbox size={18} /> },
};

interface NotificationLike {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  isRead: boolean;
  createdAt: string;
  resourceType?: string;
  resourceId?: string;
}

interface DashboardWidgetProps {
  view: WidgetView;
  userTasks: UserTask[];
}

function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint: string }) {
  return (
    <div className={styles.widgetEmpty}>
      {icon}
      <p>{title}</p>
      <span>{hint}</span>
    </div>
  );
}

export function DashboardWidget({ view, userTasks }: DashboardWidgetProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const openTask = useOpenTaskInContext();

  const handleNotifClick = async (n: NotificationLike) => {
    if (!n.isRead) markRead(n.id);
    if (n.resourceType === 'task' && n.resourceId) {
      await openTask(n.resourceId);
    }
  };

  const handleTaskClick = (task: UserTask) => {
    openTask(task.id, { projectId: task.projectId, boardId: task.boardId });
  };

  const renderBody = (): ReactNode => {
    if (view === 'notifications') {
      if (notifications.length === 0) {
        return (
          <EmptyState
            icon={<Bell size={32} strokeWidth={1.2} />}
            title="No notifications yet"
            hint="When someone mentions you or assigns a task, it will appear here."
          />
        );
      }
      const today: NotificationLike[] = [];
      const yesterday: NotificationLike[] = [];
      const older: NotificationLike[] = [];
      for (const n of notifications as NotificationLike[]) {
        const d = new Date(n.createdAt);
        if (isToday(d)) today.push(n);
        else if (isYesterday(d)) yesterday.push(n);
        else older.push(n);
      }
      const renderGroup = (title: string, items: NotificationLike[]) => {
        if (items.length === 0) return null;
        return (
          <div className={styles.notifGroup}>
            <span className={styles.notifGroupTitle}>{title}</span>
            {items.map((n) => (
              <NotificationCard key={n.id} notification={n} onClick={handleNotifClick} />
            ))}
          </div>
        );
      };
      return (
        <div className={styles.widgetScroll}>
          {renderGroup('TODAY', today)}
          {renderGroup('YESTERDAY', yesterday)}
          {renderGroup('EARLIER', older)}
        </div>
      );
    }

    const filtered =
      view === 'completed' ? userTasks.filter((t) => t.completedAt)
      : view === 'inprogress' ? userTasks.filter((t) => !t.completedAt)
      : userTasks;

    if (filtered.length === 0) {
      const empties: Record<Exclude<WidgetView, 'notifications'>, { icon: ReactNode; title: string; hint: string }> = {
        tasks: {
          icon: <ListChecks size={32} strokeWidth={1.2} />,
          title: 'No tasks assigned',
          hint: 'Tasks assigned to you will show here.',
        },
        completed: {
          icon: <CheckCircle2 size={32} strokeWidth={1.2} />,
          title: 'No completed tasks',
          hint: 'Tasks you finish will appear here.',
        },
        inprogress: {
          icon: <Inbox size={32} strokeWidth={1.2} />,
          title: 'Nothing in progress',
          hint: 'Active tasks will show here.',
        },
      };
      return <EmptyState {...empties[view]} />;
    }

    return (
      <div className={styles.widgetScroll}>
        {filtered.map((task) => (
          <TaskItem key={task.id} task={task} onClick={handleTaskClick} />
        ))}
      </div>
    );
  };

  return (
    <div className={styles.right}>
      <div className={styles.widgetHeader}>
        <div className={styles.widgetHeaderIcon}>{WIDGET_CONFIG[view].icon}</div>
        <h2 className={styles.widgetTitle}>{WIDGET_CONFIG[view].title}</h2>
      </div>
      {renderBody()}
    </div>
  );
}
