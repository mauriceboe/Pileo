import { Settings } from 'lucide-react';
import { useRegistrationSetting } from '../../hooks/useRegistrationSetting';
import styles from '../../pages/admin-page.module.css';

export function RegistrationToggleCard() {
  const { enabled, isToggling, toggle } = useRegistrationSetting();

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsHeader}>
        <Settings size={16} />
        <span className={styles.settingsTitle}>Settings</span>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <span className={styles.settingLabel}>Public Registration</span>
          <span className={styles.settingDescription}>
            Allow new users to create accounts via the register page
          </span>
        </div>
        <button
          className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
          onClick={toggle}
          disabled={isToggling}
          aria-label="Toggle registration"
        >
          <span className={styles.toggleKnob} />
        </button>
      </div>
    </div>
  );
}
