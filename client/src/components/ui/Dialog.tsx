import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './dialog.module.css';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
  size?: DialogSize;
}

export function Dialog({ open, onClose, title, ariaLabel, children, size = 'md' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  const sizeClass = size === 'sm'
    ? styles.sizeSm
    : size === 'lg'
      ? styles.sizeLg
      : size === 'xl'
        ? styles.sizeXl
        : size === '2xl'
          ? styles.size2xl
          : styles.sizeMd;

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
    >
      <div className={`${styles.dialog} ${sizeClass}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
