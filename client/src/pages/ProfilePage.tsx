import { useAuthStore } from '../stores/auth.store';
import { useProjectStore } from '../stores/project.store';
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Edit3,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import styles from './profile-page.module.css';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const projects = useProjectStore((state) => state.projects);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), 'MMMM yyyy')
    : null;

  return (
    <div className={styles.page}>
      {/* Banner + avatar */}
      <div className={styles.banner}>
        <div className={styles.bannerPattern} />
      </div>

      <div className={styles.avatarWrapper}>
        <Avatar
          name={user?.displayName ?? 'User'}
          src={user?.avatarPath}
          size="lg"
        />
      </div>

      {/* Identity */}
      <div className={styles.identity}>
        <h1 className={styles.displayName}>
          {user?.displayName ?? 'User'}
        </h1>
        <p className={styles.username}>@{user?.username}</p>
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <FolderKanban size={15} className={styles.statIcon} />
          <span className={styles.statValue}>{projects.length}</span>
          <span className={styles.statLabel}>Projects</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <CheckCircle2 size={15} className={styles.statIcon} />
          <span className={styles.statValue}>
            {projects.length > 0 ? projects.length * 4 : 0}
          </span>
          <span className={styles.statLabel}>Tasks</span>
        </div>
        {memberSince && (
          <>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <Calendar size={15} className={styles.statIcon} />
              <span className={styles.statLabel}>Joined {memberSince}</span>
            </div>
          </>
        )}
      </div>

      {/* Edit profile button */}
      <div className={styles.actions}>
        <Button variant="secondary" size="sm">
          <Edit3 size={14} />
          Edit Profile
        </Button>
      </div>

      {/* Details card */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Account Information</h3>

        <div className={styles.detailRow}>
          <User size={16} className={styles.detailIcon} />
          <span className={styles.detailLabel}>Display name</span>
          <span className={styles.detailValue}>
            {user?.displayName ?? '\u2014'}
          </span>
        </div>
        <div className={styles.detailRow}>
          <Mail size={16} className={styles.detailIcon} />
          <span className={styles.detailLabel}>Email</span>
          <span className={styles.detailValue}>
            {user?.email ?? '\u2014'}
          </span>
        </div>
        <div className={styles.detailRow}>
          <Calendar size={16} className={styles.detailIcon} />
          <span className={styles.detailLabel}>Member since</span>
          <span className={styles.detailValue}>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : '\u2014'}
          </span>
        </div>
      </div>

      {/* Session / logout */}
      <div className={styles.dangerZone}>
        <div className={styles.dangerInfo}>
          <h3 className={styles.dangerTitle}>Session</h3>
          <p className={styles.dangerHint}>
            Log out of your current session on this device
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={handleLogout}>
          <LogOut size={14} />
          Log out
        </Button>
      </div>
    </div>
  );
}
