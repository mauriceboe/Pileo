import type { ReactNode } from 'react';
import styles from './login-page.module.css';

interface AuthShellProps {
  subtitle: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ subtitle, children, footer }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pileo</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

export function AuthErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.serverError} role="alert">
      {message}
    </div>
  );
}
