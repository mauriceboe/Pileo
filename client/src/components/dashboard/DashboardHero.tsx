import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, ListChecks, CheckCircle2, Inbox, Plus, LayoutDashboard, ChevronRight, Settings,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useProjectStore } from '../../stores/project.store';
import { useAppVersion } from '../../hooks/useAppVersion';
import type { DashboardStats } from '../../api/stats.api';
import { getProjectIcon } from '../../constants/project-icons';
import { getQuote, getTimeGreeting } from '../../utils/greeting';
import { Avatar } from '../ui/Avatar';
import type { WidgetView } from './DashboardWidget';
import styles from '../../pages/dashboard-page.module.css';

interface DashboardHeroProps {
  stats: DashboardStats;
  activeWidget: WidgetView;
  onSelectWidget: (view: WidgetView) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onCreateProject: () => void;
}

interface Tile {
  id: WidgetView;
  icon: ReactNode;
  count: number;
  label: string;
  colorClass: string | undefined;
}

export function DashboardHero({
  stats,
  activeWidget,
  onSelectWidget,
  onOpenSettings,
  onOpenProfile,
  onCreateProject,
}: DashboardHeroProps) {
  const user = useAuthStore((s) => s.user);
  const projects = useProjectStore((s) => s.projects);
  const version = useAppVersion();
  const boardsByProject = useProjectStore((s) => s.boardsByProject);
  const isLoading = useProjectStore((s) => s.isLoading);
  const navigate = useNavigate();

  const tiles: Tile[] = [
    { id: 'notifications', icon: <Bell size={18} />, count: stats.notifications, label: 'Notifications', colorClass: styles.iconPurple },
    { id: 'tasks', icon: <ListChecks size={18} />, count: stats.totalTasks, label: 'My Tasks', colorClass: styles.iconSlate },
    { id: 'completed', icon: <CheckCircle2 size={18} />, count: stats.completed, label: 'Completed', colorClass: styles.iconTeal },
    { id: 'inprogress', icon: <Inbox size={18} />, count: stats.inProgress, label: 'In Progress', colorClass: styles.iconGreenSolid },
  ];

  return (
    <div className={styles.left}>
      <div className={styles.topActions}>
        <span className={styles.topLogo}>
          Pileo <span className={styles.alphaBadge}>Alpha</span>
          <span className={styles.versionBadge}>v{version}</span>
        </span>
        <div className={styles.topRight}>
          <button className={styles.topBtn} onClick={onOpenSettings}>
            <Settings size={18} />
          </button>
          <button className={styles.topAvatarBtn} onClick={onOpenProfile}>
            <Avatar name={user?.displayName ?? 'User'} src={user?.avatarPath} size="sm" />
          </button>
        </div>
      </div>

      <section className={styles.greeting}>
        <h1 className={styles.greetingTitle}>
          {getTimeGreeting()}{user?.displayName ? `, ${user.displayName}` : ''}
        </h1>
        <p className={styles.quote}>{getQuote()}</p>
      </section>

      <section className={styles.tiles}>
        {tiles.map((t) => (
          <button
            key={t.id}
            className={`${styles.tile} ${activeWidget === t.id ? styles.tileActive : ''}`}
            onClick={() => onSelectWidget(t.id)}
          >
            <div className={`${styles.tileIconCircle} ${t.colorClass ?? ''}`}>{t.icon}</div>
            <div className={styles.tileInfo}>
              <span className={styles.tileCount}>{t.count}</span>
              <span className={styles.tileLabel}>{t.label}</span>
            </div>
          </button>
        ))}
      </section>

      <section className={styles.projectSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <button className={styles.newProjectBtn} onClick={onCreateProject}>
            <Plus size={14} /> New Project
          </button>
        </div>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : projects.length === 0 ? (
          <p className={styles.emptyText}>No projects yet.</p>
        ) : (
          <div className={styles.projectGroupList}>
            {projects.map((project) => {
              const Icon = getProjectIcon(project.icon);
              const boards = boardsByProject[project.id] ?? [];
              return (
                <div key={project.id} className={styles.projectGroup}>
                  <div className={styles.projectGroupHeader}>
                    <Icon size={14} />
                    <span className={styles.projectGroupName}>{project.name}</span>
                  </div>
                  {boards.length > 0 ? (
                    <div className={styles.projectGrid}>
                      {boards.map((board) => (
                        <button
                          key={board.id}
                          className={styles.projectCard}
                          onClick={() => navigate(`/projects/${project.id}/boards/${board.id}`)}
                        >
                          <div className={styles.projectCardIcon}><LayoutDashboard size={16} /></div>
                          <div className={styles.projectCardInfo}>
                            <span className={styles.projectCardName}>{board.name}</span>
                          </div>
                          <ChevronRight size={16} className={styles.projectCardArrow} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.emptyText}>No boards yet.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
