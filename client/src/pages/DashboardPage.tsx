import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import { useNotificationStore } from '../stores/notification.store';
import * as statsApi from '../api/stats.api';
import type { UserTask } from '../api/stats.api';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, isToday, isYesterday, isPast, format } from 'date-fns';
import {
  Bell, ListChecks, CheckCircle2, Inbox, Layers,
  AtSign, UserPlus, MessageSquare, Settings, User, ChevronRight, Calendar,
  LayoutDashboard, Star, Zap, Rocket, Target, Flag, Heart, Coffee, Sun,
  Moon, Cloud, Flame, Music, Camera, Gift, Award, Bookmark, Globe, Lightbulb,
  Code, Briefcase, Bug, Compass, Feather, Folder, Package, Puzzle,
  type LucideIcon,
} from 'lucide-react';
import { SettingsDialog } from '../components/ui/SettingsDialog';
import { ProfileDialog } from '../components/ui/ProfileDialog';
import styles from './dashboard-page.module.css';

const PROJECT_ICON_MAP: Record<string, LucideIcon> = {
  layers: Layers, folder: Folder, briefcase: Briefcase, rocket: Rocket,
  star: Star, zap: Zap, target: Target, flag: Flag, heart: Heart,
  globe: Globe, lightbulb: Lightbulb, code: Code, bug: Bug, compass: Compass,
  package: Package, puzzle: Puzzle, feather: Feather, flame: Flame,
  award: Award, bookmark: Bookmark, coffee: Coffee, sun: Sun, moon: Moon,
  cloud: Cloud, music: Music, camera: Camera, gift: Gift, bell: Bell,
};

function getProjectIcon(iconName: string | null | undefined): LucideIcon {
  return (iconName && PROJECT_ICON_MAP[iconName]) || Layers;
}

const QUOTES = [
  '"The secret of getting ahead is getting started." — Mark Twain',
  '"Done is better than perfect." — Sheryl Sandberg',
  '"Focus on being productive instead of busy." — Tim Ferriss',
  '"Small progress is still progress."',
  '"Ship it, then iterate."',
];

function getQuote(): string { return QUOTES[new Date().getDate() % QUOTES.length]!; }
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

type WidgetView = 'notifications' | 'tasks' | 'completed' | 'inprogress';

const WIDGET_CONFIG: Record<WidgetView, { title: string; icon: React.ReactNode }> = {
  notifications: { title: 'Notifications', icon: <Bell size={18} /> },
  tasks: { title: 'My Tasks', icon: <ListChecks size={18} /> },
  completed: { title: 'Completed', icon: <CheckCircle2 size={18} /> },
  inprogress: { title: 'In Progress', icon: <Inbox size={18} /> },
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { projects, boardsByProject, isLoading, fetchProjects, fetchAllBoards } = useProjectStore();
  const { notifications, fetchNotifications, markRead } = useNotificationStore();
  const navigate = useNavigate();
  const [activeWidget, setActiveWidget] = useState<WidgetView>('notifications');
  const [stats, setStats] = useState({ totalTasks: 0, completed: 0, inProgress: 0, notifications: 0 });
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try { setStats(await statsApi.getDashboardStats()); } catch {}
  }, []);

  const fetchUserTasks = useCallback(async () => {
    try { setUserTasks(await statsApi.getUserTasks()); } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchProjects();
      await fetchAllBoards();
    };
    load();
    fetchNotifications();
    fetchStats();
    fetchUserTasks();
  }, [fetchProjects, fetchAllBoards, fetchNotifications, fetchStats, fetchUserTasks]);

  const tiles: Array<{ id: WidgetView; icon: React.ReactNode; count: number; label: string; colorClass: string }> = [
    { id: 'notifications', icon: <Bell size={18} />, count: stats.notifications, label: 'Notifications', colorClass: styles.iconPurple! },
    { id: 'tasks', icon: <ListChecks size={18} />, count: stats.totalTasks, label: 'My Tasks', colorClass: styles.iconSlate! },
    { id: 'completed', icon: <CheckCircle2 size={18} />, count: stats.completed, label: 'Completed', colorClass: styles.iconTeal! },
    { id: 'inprogress', icon: <Inbox size={18} />, count: stats.inProgress, label: 'In Progress', colorClass: styles.iconGreenSolid! },
  ];

  // Filter tasks by widget
  const allTasks = userTasks;
  const completedTasks = allTasks.filter((t) => t.completedAt);
  const inProgressTasks = allTasks.filter((t) => !t.completedAt);

  // Notification grouping
  const groupedNotifs = (() => {
    const today: any[] = [], yesterday: any[] = [], older: any[] = [];
    for (const n of notifications as any[]) {
      const d = new Date(n.createdAt);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else older.push(n);
    }
    return { today, yesterday, older };
  })();

  const notifIconClass: Record<string, string> = {
    mention: styles.notifIconMention ?? '',
    assignment: styles.notifIconAssignment ?? '',
    comment: styles.notifIconComment ?? '',
  };

  const notifIcons: Record<string, React.ReactNode> = {
    mention: <AtSign size={16} />,
    assignment: <UserPlus size={16} />,
    comment: <MessageSquare size={16} />,
  };

  const renderNotifGroup = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <div className={styles.notifGroup}>
        <span className={styles.notifGroupTitle}>{title}</span>
        {items.map((n: any) => (
          <button key={n.id} className={`${styles.notifCard} ${!n.isRead ? styles.notifUnread : ''}`} onClick={() => markRead(n.id)}>
            <div className={`${styles.notifIcon} ${notifIconClass[n.type] ?? ''}`}>
              {notifIcons[n.type] ?? <Bell size={16} />}
            </div>
            <div className={styles.notifBody}>
              <span className={styles.notifTime}>
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
              <span className={styles.notifTitle}>
                <span className={styles.notifTitleBold}>{n.title}</span>
              </span>
              {n.message && (
                <div className={styles.notifMessage}>{n.message}</div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderTaskItem = (task: UserTask) => {
    const isOverdue = task.dueDate && !task.completedAt && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate));
    return (
      <button
        key={task.id}
        className={`${styles.notifCard} ${task.completedAt ? styles.taskCompleted : ''}`}
        onClick={() => navigate(`/projects/${task.projectId}/boards/${task.boardId}`)}
      >
        <div className={styles.notifIcon} style={{ background: task.columnColor, boxShadow: `0 2px 8px ${task.columnColor}44` }}>
          {task.completedAt ? <CheckCircle2 size={16} /> : <ListChecks size={16} />}
        </div>
        <div className={styles.notifBody}>
          <span className={styles.notifTime}>
            {task.boardName} · {task.columnName}
          </span>
          <span className={styles.notifTitle}>
            <span className={styles.notifTitleBold}>{task.title}</span>
          </span>
          {(task.dueDate || task.priority !== 'none') && (
            <div className={styles.notifMessage}>
              {task.dueDate && (
                <span className={isOverdue ? styles.taskOverdue : ''}>
                  <Calendar size={11} /> {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  {isOverdue && ' · Overdue'}
                </span>
              )}
              {task.priority !== 'none' && (
                <span> · Priority: {task.priority}</span>
              )}
            </div>
          )}
        </div>
      </button>
    );
  };

  const renderWidget = () => {
    if (activeWidget === 'notifications') {
      return notifications.length === 0 ? (
        <div className={styles.widgetEmpty}>
          <Bell size={32} strokeWidth={1.2} />
          <p>No notifications yet</p>
          <span>When someone mentions you or assigns a task, it will appear here.</span>
        </div>
      ) : (
        <div className={styles.widgetScroll}>
          {renderNotifGroup('TODAY', groupedNotifs.today)}
          {renderNotifGroup('YESTERDAY', groupedNotifs.yesterday)}
          {renderNotifGroup('EARLIER', groupedNotifs.older)}
        </div>
      );
    }

    if (activeWidget === 'tasks') {
      return allTasks.length === 0 ? (
        <div className={styles.widgetEmpty}>
          <ListChecks size={32} strokeWidth={1.2} />
          <p>No tasks assigned</p>
          <span>Tasks assigned to you will show here.</span>
        </div>
      ) : (
        <div className={styles.widgetScroll}>
          {allTasks.map(renderTaskItem)}
        </div>
      );
    }

    if (activeWidget === 'completed') {
      return completedTasks.length === 0 ? (
        <div className={styles.widgetEmpty}>
          <CheckCircle2 size={32} strokeWidth={1.2} />
          <p>No completed tasks</p>
          <span>Tasks you finish will appear here.</span>
        </div>
      ) : (
        <div className={styles.widgetScroll}>
          {completedTasks.map(renderTaskItem)}
        </div>
      );
    }

    if (activeWidget === 'inprogress') {
      return inProgressTasks.length === 0 ? (
        <div className={styles.widgetEmpty}>
          <Inbox size={32} strokeWidth={1.2} />
          <p>Nothing in progress</p>
          <span>Active tasks will show here.</span>
        </div>
      ) : (
        <div className={styles.widgetScroll}>
          {inProgressTasks.map(renderTaskItem)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgShapes} />

      {/* Left column */}
      <div className={styles.left}>
        <div className={styles.topActions}>
          <span className={styles.topLogo}>Pileo <span className={styles.alphaBadge}>Alpha</span></span>
          <div className={styles.topRight}>
            <button className={styles.topBtn} onClick={() => setSettingsOpen(true)}><Settings size={18} /></button>
            <button className={styles.topAvatarBtn} onClick={() => setProfileOpen(true)}><User size={16} /></button>
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
              onClick={() => setActiveWidget(t.id)}
            >
              <div className={`${styles.tileIconCircle} ${t.colorClass}`}>{t.icon}</div>
              <div className={styles.tileInfo}>
                <span className={styles.tileCount}>{t.count}</span>
                <span className={styles.tileLabel}>{t.label}</span>
              </div>
            </button>
          ))}
        </section>

        <section className={styles.projectSection}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : projects.length === 0 ? (
            <p className={styles.emptyText}>No projects yet.</p>
          ) : (
            <div className={styles.projectGroupList}>
              {projects.map((project) => {
                const Icon = getProjectIcon((project as any).icon);
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

      {/* Right — Widget panel */}
      <div className={styles.right}>
        <div className={styles.widgetHeader}>
          <div className={styles.widgetHeaderIcon}>{WIDGET_CONFIG[activeWidget].icon}</div>
          <h2 className={styles.widgetTitle}>{WIDGET_CONFIG[activeWidget].title}</h2>
        </div>
        {renderWidget()}
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
