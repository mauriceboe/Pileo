import { useState, type FormEvent } from 'react';
import type { UserPublic, UserRole } from '@pileo/shared';
import { USER_ROLES } from '@pileo/shared';
import * as adminApi from '../../api/admin.api';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import styles from '../../pages/admin-page.module.css';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: UserPublic) => void;
}

export function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setEmail('');
    setUsername('');
    setDisplayName('');
    setPassword('');
    setRole('user');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await adminApi.createUser({ email, username, displayName, password, role });
      reset();
      onCreated(user);
    } catch (thrown: unknown) {
      setError(thrown instanceof Error ? thrown.message : 'Failed to create user');
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
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
        <div className={styles.formRow}>
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="jane-doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>
        <div className={styles.formRow}>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
          />
          <div className={styles.formSelect}>
            <label className={styles.formSelectLabel}>Role</label>
            <select
              className={styles.formSelectInput}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
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
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create User</Button>
        </div>
      </form>
    </Dialog>
  );
}
