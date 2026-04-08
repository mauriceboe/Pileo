import { useState } from 'react';
import {
  Bell,
  Shield,
  Palette,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Globe,
  Lock,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import styles from './settings-page.module.css';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
}

function ToggleSwitch({ enabled, onToggle }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      className={`${styles.toggle} ${enabled ? styles.toggleOn : ''}`}
      onClick={onToggle}
    >
      <span className={styles.toggleKnob} />
    </button>
  );
}

interface ThemeOptionProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ThemeOption({ icon, label, active, onClick }: ThemeOptionProps) {
  return (
    <button
      type="button"
      className={`${styles.themeOption} ${active ? styles.themeOptionActive : ''}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [compactMode, setCompactMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [mentionNotifications, setMentionNotifications] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your preferences and account security
        </p>
      </div>

      <div className={styles.sections}>
        {/* Appearance */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionIconWrapper} ${styles.sectionIconPurple}`}>
              <Palette size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Appearance</h2>
              <p className={styles.sectionDescription}>
                Customize how Pileo looks and feels
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Theme</span>
                <span className={styles.settingHint}>
                  Choose your preferred color scheme
                </span>
              </div>
              <div className={styles.themeSelector}>
                <ThemeOption
                  icon={<Sun size={14} />}
                  label="Light"
                  active={theme === 'light'}
                  onClick={() => setTheme('light')}
                />
                <ThemeOption
                  icon={<Moon size={14} />}
                  label="Dark"
                  active={theme === 'dark'}
                  onClick={() => setTheme('dark')}
                />
                <ThemeOption
                  icon={<Monitor size={14} />}
                  label="System"
                  active={theme === 'system'}
                  onClick={() => setTheme('system')}
                />
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingLabel}>Compact mode</span>
                <span className={styles.settingHint}>
                  Reduce spacing for denser layouts
                </span>
              </div>
              <ToggleSwitch
                enabled={compactMode}
                onToggle={() => setCompactMode(!compactMode)}
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionIconWrapper} ${styles.sectionIconBlue}`}>
              <Bell size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Notifications</h2>
              <p className={styles.sectionDescription}>
                Control how and when you receive updates
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Mail size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>
                    Email notifications
                  </span>
                  <span className={styles.settingHint}>
                    Receive emails for task assignments and updates
                  </span>
                </div>
              </div>
              <ToggleSwitch
                enabled={emailNotifications}
                onToggle={() => setEmailNotifications(!emailNotifications)}
              />
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Smartphone size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>
                    Push notifications
                  </span>
                  <span className={styles.settingHint}>
                    Browser push notifications for real-time updates
                  </span>
                </div>
              </div>
              <ToggleSwitch
                enabled={pushNotifications}
                onToggle={() => setPushNotifications(!pushNotifications)}
              />
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Globe size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>
                    @mention alerts
                  </span>
                  <span className={styles.settingHint}>
                    Get notified when someone mentions you
                  </span>
                </div>
              </div>
              <ToggleSwitch
                enabled={mentionNotifications}
                onToggle={() => setMentionNotifications(!mentionNotifications)}
              />
            </div>
          </div>
        </section>

        {/* Security */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionIconWrapper} ${styles.sectionIconGreen}`}>
              <Shield size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Security</h2>
              <p className={styles.sectionDescription}>
                Manage your account security and sessions
              </p>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Lock size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>
                    Two-factor authentication
                  </span>
                  <span className={styles.settingHint}>
                    Add an extra layer of security to your account
                  </span>
                </div>
              </div>
              <ToggleSwitch
                enabled={twoFactor}
                onToggle={() => setTwoFactor(!twoFactor)}
              />
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Monitor size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>Active sessions</span>
                  <span className={styles.settingHint}>
                    You are currently logged in on 1 device
                  </span>
                </div>
              </div>
              <button type="button" className={styles.actionLink}>
                Manage
              </button>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <Lock size={15} className={styles.settingRowIcon} />
                <div>
                  <span className={styles.settingLabel}>Change password</span>
                  <span className={styles.settingHint}>
                    Update your password regularly to stay secure
                  </span>
                </div>
              </div>
              <button type="button" className={styles.actionLink}>
                Update
              </button>
            </div>
          </div>
        </section>

        {/* Danger zone */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.sectionIconWrapper} ${styles.sectionIconRed}`}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Danger Zone</h2>
              <p className={styles.sectionDescription}>
                Irreversible actions that affect your account
              </p>
            </div>
          </div>

          <div className={styles.dangerCard}>
            <div className={styles.dangerRow}>
              <div>
                <span className={styles.settingLabel}>Delete account</span>
                <span className={styles.settingHint}>
                  Permanently remove your account and all associated data. This
                  action cannot be undone.
                </span>
              </div>
              <Button variant="danger" size="sm">
                <Trash2 size={14} />
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
