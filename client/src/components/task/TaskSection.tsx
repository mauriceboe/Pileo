import type { ReactNode } from 'react';
import styles from './task-detail.module.css';

interface TaskSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

export function TaskSection({ icon, title, children }: TaskSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h4 className={styles.sectionTitle}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

interface TaskSidebarSectionProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

export function TaskSidebarSection({ icon, label, children }: TaskSidebarSectionProps) {
  return (
    <div className={styles.sidebarSection}>
      <div className={styles.sidebarLabelRow}>
        <span className={styles.sidebarIcon}>{icon}</span>
        <span className={styles.sidebarLabel}>{label}</span>
      </div>
      {children}
    </div>
  );
}
