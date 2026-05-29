import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { UserPublic } from '@pileo/shared';
import { useAuthStore } from '../stores/auth.store';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { Button } from '../components/ui/Button';
import { RegistrationToggleCard } from '../components/admin/RegistrationToggleCard';
import { UserRow } from '../components/admin/UserRow';
import { CreateUserDialog } from '../components/admin/CreateUserDialog';
import styles from './admin-page.module.css';

export function AdminPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { users, isLoading, changeRole, deleteUser, appendUser } = useAdminUsers();
  const [showCreate, setShowCreate] = useState(false);

  const handleDelete = (user: UserPublic) => {
    if (!window.confirm(`Delete user "${user.displayName}"? This action cannot be undone.`)) return;
    deleteUser(user.id);
  };

  const handleCreated = (user: UserPublic) => {
    appendUser(user);
    setShowCreate(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Manage registered users, roles, and access</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Create User
        </Button>
      </div>

      <RegistrationToggleCard />

      {isLoading ? (
        <p className={styles.loading}>Loading users...</p>
      ) : users.length === 0 ? (
        <p className={styles.empty}>No users found.</p>
      ) : (
        <div className={styles.tableCard}>
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              isSelf={user.id === currentUser?.id}
              onRoleChange={changeRole}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
