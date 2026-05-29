import type { ButtonHTMLAttributes, Ref } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import styles from './button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ref,
  ...rest
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    loading ? styles.loading : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      className={classNames}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className={styles.spinnerWrapper}>
          <LoadingSpinner size="sm" />
        </span>
      )}
      <span className={`${styles.content} ${loading ? styles.hiddenContent : ''}`}>
        {children}
      </span>
    </button>
  );
}
