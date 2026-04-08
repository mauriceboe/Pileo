import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import styles from './custom-select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Select...', disabled }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < 220 && r.top > spaceBelow;
      setPos({
        top: openUp ? r.top - 4 : r.bottom + 4,
        left: r.left,
        width: r.width,
      });
    }
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => { if (!disabled) setOpen((o) => !o); }}
        disabled={disabled}
      >
        <span className={selected ? styles.triggerValue : styles.triggerPlaceholder}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && pos && ReactDOM.createPortal(
        <div
          ref={dropRef}
          className={styles.dropdown}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className={styles.optionList}>
            {options.length === 0 ? (
              <div className={styles.empty}>No options</div>
            ) : (
              options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                    onClick={() => { onChange(option.value); setOpen(false); }}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    {isSelected && <Check size={13} className={styles.checkIcon} />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
