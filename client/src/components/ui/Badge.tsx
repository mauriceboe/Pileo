import type { ReactNode } from 'react';
import styles from './badge.module.css';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: string;
  className?: string;
}

export function Badge({ children, variant = 'default', color, className }: BadgeProps) {
  const classNames = [styles.badge, !color ? styles[variant] : '', className]
    .filter(Boolean)
    .join(' ');

  // Custom color: vivid background with white text
  const customStyle = color
    ? { backgroundColor: color, color: '#FFFFFF' }
    : undefined;

  return (
    <span className={classNames} style={customStyle}>
      {children}
    </span>
  );
}
