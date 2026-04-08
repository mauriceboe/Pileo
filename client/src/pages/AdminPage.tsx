import { useEffect, useState, useCallback } from 'react';
import { Shield, Plus, Trash2 } from 'lucide-react';
import type { UserPublic, UserRole } from '@pileo/shared';
import { USER_ROLES } from '@pileo/shared';
import * as adminApi from '../api/admin.api';
import { useAuthStore } from '../stores/auth.store';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import styles from './admin-page.module.css';

export function AdminPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch {
      // API error handled by the fetch client
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, role: UserRole): Promise<void> => {
    try {
      const updated = await adminApi.updateUserRole(userId, { role });
      setUsers((previous) =>
        previous.map((user) => (user.id === userId ? updated : user)),
      );
    } catch {
      // API error handled by the fetch client
    }
  };

  const handleDelete = async (userId: string, displayName: string): Promise<void> => {
    if (!window.confirm(`Delete user "${displayName}"? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(userId);
      setUsers((previous) => previous.filter((user) => user.id !== userId));
    } catch {
      // API error handled by the fetch client
    }
  };

  const handleUserCreated = (user: UserPublic): void => {
    setUsers((previous) => [...previous, user]);
    setShowCreateDialog(false);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>
            Manage registered users, roles, and access
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus size={16} />
          Create User
        </Button>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Loading users...</p>
      ) : users.length === 0 ? (
        <p className={styles.empty}>No users found.</p>
      ) : (
        <div className={styles.tableCard}>
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;

            return (
              <div key={user.id} className={styles.userRow}>
                <Avatar name={user.displayName} src={user.avatarPath} size="md" />
                <div className={styles.userInfo}>
                  <div className={styles.userName}>
                    {user.displayName}
                    {isSelf && <span className={styles.selfBadge}>you</span>}
                  </div>
                  <div className={styles.userMeta}>
                    <span className={styles.userEmail}>{user.email}</span>
                    <span className={styles.metaSep}>·</span>
                    <span>@{user.username}</span>
                    <span className={styles.metaSep}>·</span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>
                <div className={styles.userActions}>
                  {isSelf ? (
                    <Badge variant="primary">
                      <Shield size={12} />
                      {' '}Admin
                    </Badge>
                  ) : (
                    <>
                      <select
                        className={styles.roleSelect}
                        value={user.role}
                        onChange={(event) =>
                          handleRoleChange(user.id, event.target.value as UserRole)
                        }
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(user.id, user.displayName)}
                        aria-label={`Delete ${user.displayName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleUserCreated}
      />
    </div>
  );
}

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserPublic) => void;
}

function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = (): void => {
    setEmail('');
    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole('user');
    setError('');
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await adminApi.createUser({
        email,
        username,
        displayName,
        password,
        role,
      });
      resetForm();
      onCreated(user);
    } catch (thrown: unknown) {
      const message = thrown instanceof Error ? thrown.message : 'Failed to create user';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Create User">
      <form className={styles.form} onSubmit={handleSubmit}>
        <Input
          label="Display Name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Jane Doe"
          required
        />
        <div className={styles.formRow}>
          <Input
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="jane-doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>
        <div className={styles.formRow}>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
          <div className={styles.formSelect}>
            <label className={styles.formSelectLabel}>Role</label>
            <select
              className={styles.formSelectInput}
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formActions}>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create User
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
