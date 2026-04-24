import styles from './toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  accent?: string;
}

export function Toggle({ checked, onChange, label, description, disabled, accent }: ToggleProps) {
  const handleClick = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const trackStyle = checked && accent ? { backgroundColor: accent, borderColor: accent } : undefined;

  return (
    <button
      type="button"
      className={`${styles.row} ${disabled ? styles.disabled : ''}`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      {(label || description) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {description && <span className={styles.description}>{description}</span>}
        </span>
      )}
      <span
        className={`${styles.track} ${checked ? styles.trackOn : ''}`}
        style={trackStyle}
        aria-hidden
      >
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
