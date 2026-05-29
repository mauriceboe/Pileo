import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { SettingsDialog } from '../components/ui/SettingsDialog';
import { ProfileDialog } from '../components/ui/ProfileDialog';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DashboardWidget, type WidgetView } from '../components/dashboard/DashboardWidget';
import { CreateProjectDialog } from '../components/dashboard/CreateProjectDialog';
import styles from './dashboard-page.module.css';

export function DashboardPage() {
  const { stats, userTasks } = useDashboardData();
  const [activeWidget, setActiveWidget] = useState<WidgetView>('notifications');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.bgShapes} />
      <DashboardHero
        stats={stats}
        activeWidget={activeWidget}
        onSelectWidget={setActiveWidget}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenProfile={() => setProfileOpen(true)}
        onCreateProject={() => setCreateOpen(true)}
      />
      <DashboardWidget view={activeWidget} userTasks={userTasks} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
