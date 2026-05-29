import type { ReactNode } from 'react';
import { Tag, Flag } from 'lucide-react';
import { COLUMN_ICON_MAP } from '../../constants/column-icons';
import styles from './task-activity.module.css';

interface BadgeProps {
  name: string;
  color?: string | null;
}

export function ColumnBadge({ name, color, icon }: BadgeProps & { icon?: string | null }) {
  const Icon = icon ? COLUMN_ICON_MAP[icon] : null;
  const bg = color ?? '#6B7280';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      {Icon ? <Icon size={11} /> : <span className={styles.badgeDot} />}
      <span className={styles.badgeLabel}>{name}</span>
    </span>
  );
}

export function LabelBadge({ name, color }: BadgeProps) {
  const bg = color ?? '#6B7280';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      <Tag size={11} />
      <span className={styles.badgeLabel}>{name}</span>
    </span>
  );
}

const PRIORITY_PALETTE: Record<string, string> = {
  none: '#9CA3AF',
  low: '#3B82F6',
  medium: '#F59E0B',
  high: '#F97316',
  urgent: '#EF4444',
};

export function PriorityBadge({ value }: { value: string }) {
  const bg = PRIORITY_PALETTE[value] ?? '#9CA3AF';
  return (
    <span className={styles.badge} style={{ backgroundColor: bg }}>
      <Flag size={11} />
      <span className={styles.badgeLabel}>{value}</span>
    </span>
  );
}

const META_PALETTE: Record<string, string> = {
  neutral: '#6B7280',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#9CA3AF',
};

type MetaTone = 'neutral' | 'success' | 'warning' | 'danger';

export function MetaBadge({ icon, label, tone = 'neutral' }: { icon: ReactNode; label: string; tone?: MetaTone }) {
  return (
    <span className={styles.badge} style={{ backgroundColor: META_PALETTE[tone] }}>
      {icon}
      <span className={styles.badgeLabel}>{label}</span>
    </span>
  );
}
