import { isPast, isToday } from 'date-fns';
import type { TaskWithRelations } from '@pileo/shared';
import styles from './task-card.module.css';

interface BannerSpec {
  text: string;
  className: string;
}

const PRIO_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

function getBanners(task: TaskWithRelations): BannerSpec[] {
  const banners: BannerSpec[] = [];
  const completed = !!task.completedAt;
  const rejected = !!task.rejectedAt;
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const overdue = due && isPast(due) && !isToday(due);
  const dueToday = due && isToday(due);
  const inactive = completed || rejected;

  if (completed) banners.push({ text: 'Completed', className: styles.bannerCompleted! });
  if (rejected && !completed) banners.push({ text: 'Rejected', className: styles.bannerRejected! });
  if (overdue && !inactive) banners.push({ text: 'Overdue', className: styles.bannerOverdue! });
  if (dueToday && !overdue && !inactive) banners.push({ text: 'Due today', className: styles.bannerDueToday! });

  const hasPrio = task.priority && task.priority !== 'none' && !inactive;
  if (hasPrio) {
    const cls: Record<string, string> = {
      low: styles.bannerPrioLow ?? '',
      medium: styles.bannerPrioMedium ?? '',
      high: styles.bannerPrioHigh ?? '',
      urgent: styles.bannerPrioUrgent ?? '',
    };
    banners.push({ text: PRIO_LABEL[task.priority] ?? '', className: cls[task.priority] ?? '' });
  }

  return banners;
}

export function TaskCardBanners({ task }: { task: TaskWithRelations }) {
  const banners = getBanners(task);
  if (banners.length === 0) return null;
  return (
    <div className={styles.bannerRow}>
      {banners.map((b, i) => (
        <span key={i} className={`${styles.bannerPill} ${b.className}`}>{b.text}</span>
      ))}
    </div>
  );
}
