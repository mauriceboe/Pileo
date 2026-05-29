import { Sun, Moon, LogOut } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { useLogout } from '../../hooks/useLogout';
import { useAppVersion } from '../../hooks/useAppVersion';
import { Dialog } from './Dialog';
import { ConnectedApplications } from '../settings/ConnectedApplications';
import styles from './settings-dialog.module.css';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const handleLogout = useLogout();
  const version = useAppVersion();

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className={styles.content}>
        {/* Theme */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Appearance</span>
          <div className={styles.themeSelector}>
            <button
              className={`${styles.themeOption} ${theme === 'light' ? styles.themeActive : ''}`}
              onClick={() => setTheme('light')}
            >
              <Sun size={16} />
              Light
            </button>
            <button
              className={`${styles.themeOption} ${theme === 'dark' ? styles.themeActive : ''}`}
              onClick={() => setTheme('dark')}
            >
              <Moon size={16} />
              Dark
            </button>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Connected applications (OAuth 2.1 / MCP) */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Connected applications</span>
          <ConnectedApplications />
        </div>

        <div className={styles.divider} />

        {/* Account */}
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Account</span>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.version}>
          Pileo v{version}
        </div>
      </div>
    </Dialog>
  );
}
