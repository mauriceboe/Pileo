import { useCallback, useEffect, useState } from 'react';
import type { UserPublic, UserRole } from '@pileo/shared';
import * as adminApi from '../api/admin.api';

interface UseAdminUsersResult {
  users: UserPublic[];
  isLoading: boolean;
  reload: () => Promise<void>;
  changeRole: (userId: string, role: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  appendUser: (user: UserPublic) => void;
}

export function useAdminUsers(): UseAdminUsersResult {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setUsers(await adminApi.listUsers());
    } catch {
      // Errors surfaced by API layer
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const changeRole = useCallback(async (userId: string, role: UserRole) => {
    try {
      const updated = await adminApi.updateUserRole(userId, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch {
      // Errors surfaced by API layer
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      // Errors surfaced by API layer
    }
  }, []);

  const appendUser = useCallback((user: UserPublic) => {
    setUsers((prev) => [...prev, user]);
  }, []);

  return { users, isLoading, reload, changeRole, deleteUser, appendUser };
}
