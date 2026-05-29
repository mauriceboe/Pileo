import { useEffect, useState } from 'react';
import * as authApi from '../api/auth.api';

/**
 * Checks the public registration-status endpoint.
 * Returns `true` while loading (optimistic — most installs leave it on)
 * to avoid flashing the disabled state for a frame.
 */
export function useRegistrationOpen(): boolean {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    authApi
      .getRegistrationStatus()
      .then((s) => setIsOpen(s.enabled))
      .catch(() => {
        // On failure leave optimistic default; UI will fail on submit instead
      });
  }, []);

  return isOpen;
}
