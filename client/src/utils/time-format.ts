import { differenceInMinutes, differenceInHours, differenceInDays, format } from 'date-fns';

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const mins = differenceInMinutes(now, date);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;
  return format(date, 'MMM d');
}
