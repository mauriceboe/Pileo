import { useCallback, useEffect, useState } from 'react';
import * as adminApi from '../api/admin.api';

interface UseRegistrationSettingResult {
  enabled: boolean;
  isToggling: boolean;
  toggle: () => Promise<void>;
}

export function useRegistrationSetting(): UseRegistrationSettingResult {
  const [enabled, setEnabled] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((s) => setEnabled(s.registrationEnabled))
      .catch(() => {
        // Errors surfaced by API layer
      });
  }, []);

  const toggle = useCallback(async () => {
    setIsToggling(true);
    try {
      const updated = await adminApi.updateSettings({ registrationEnabled: !enabled });
      setEnabled(updated.registrationEnabled);
    } catch {
      // Errors surfaced by API layer
    } finally {
      setIsToggling(false);
    }
  }, [enabled]);

  return { enabled, isToggling, toggle };
}
