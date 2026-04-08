import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import styles from './context-menu.module.css';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export type ContextMenuEntry = ContextMenuItem | 'divider';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const getPosition = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return { top: y, left: x };

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    let top = y;
    let left = x;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding;
    }

    return { top, left };
  }, [x, y]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { top, left } = getPosition();
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }, [getPosition]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div ref={menuRef} className={styles.menu} role="menu" style={{ top: y, left: x }}>
        {items.map((item, index) => {
          if (item === 'divider') {
            return <div key={index} className={styles.divider} role="separator" />;
          }

          return (
            <button
              key={index}
              className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
              role="menuitem"
              onClick={() => {
                item.onClick();
                onClose();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export interface ContextMenuState {
  x: number;
  y: number;
  data?: unknown;
}

