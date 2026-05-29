import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export function useLogout(): () => Promise<void> {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);
}
