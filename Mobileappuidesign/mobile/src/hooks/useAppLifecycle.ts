import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/src/contexts/AuthContext';
import { trackActivity, resetHeartbeatThrottle } from '@/src/utils/heartbeat';

export const useAppLifecycle = () => {
  const { supabaseProfile } = useAuth();

  useEffect(() => {
    // ⚡ Envoyer un heartbeat immédiatement au montage (premier lancement)
    const sendInitialHeartbeat = async () => {
      console.log('[useAppLifecycle] Sending initial heartbeat on mount');
      resetHeartbeatThrottle();
      await trackActivity(supabaseProfile?.id);
    };

    sendInitialHeartbeat();

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        resetHeartbeatThrottle();
        // trackActivity gère automatiquement user vs visitor
        await trackActivity(supabaseProfile?.id);
      } else if (nextAppState === 'background') {
        // trackActivity gère automatiquement user vs visitor
        await trackActivity(supabaseProfile?.id);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [supabaseProfile?.id]);
};
