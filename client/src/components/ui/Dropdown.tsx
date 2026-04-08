import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import styles from './dropdown.module.css';

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface DropdownProps {
  items: (DropdownItem | 'divider')[];
  trigger?: ReactNode;
}

export function Dropdown({ items, trigger }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className={styles.container} ref={containerRef}>
      {trigger ? (
        <div onClick={() => setOpen((previous) => !previous)}>{trigger}</div>
      ) : (
        <button
          className={styles.trigger}
          onClick={() => setOpen((previous) => !previous)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <MoreVertical size={16} />
        </button>
      )}

      {open && (
        <div className={styles.menu} role="menu">
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
                  setOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
