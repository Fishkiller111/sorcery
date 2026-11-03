import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useFeatureFlagsStore } from '../stores/featureFlagsStore';

/** Dev gate or public launch flag (never hardcode public true). */
export function useSimulatorAccess() {
  const isDevUser = useAuthStore((s) => s.user?.is_dev === true);
  const simulatorPublicEnabled = useFeatureFlagsStore((s) => s.simulatorPublicEnabled);
  const ensureLoaded = useFeatureFlagsStore((s) => s.ensureLoaded);

  useEffect(() => {
    void ensureLoaded();
  }, [ensureLoaded]);

  return {
    isDevUser,
    simulatorPublicEnabled,
    canAccessSimulator: isDevUser || simulatorPublicEnabled,
  };
}
