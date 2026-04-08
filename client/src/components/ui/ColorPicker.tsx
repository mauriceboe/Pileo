import { DEFAULT_COLUMN_COLORS } from '@pileo/shared';
import styles from './color-picker.module.css';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className={styles.container} role="radiogroup" aria-label="Color selection">
      {DEFAULT_COLUMN_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`${styles.swatch} ${value === color ? styles.selected : ''}`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          role="radio"
          aria-checked={value === color}
          aria-label={color}
        />
      ))}
    </div>
  );
}
