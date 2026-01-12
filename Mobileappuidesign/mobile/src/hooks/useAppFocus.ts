import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

type AppFocusCallback = (isFocused: boolean) => void;

export const useAppFocus = (onFocusChange: AppFocusCallback) => {
  const appStateRef = useRef(AppState.currentState);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const isFocused = nextAppState === 'active';
      const wasFocused = appStateRef.current === 'active';

      console.log('[useAppFocus] App state changed:', {
        from: appStateRef.current,
        to: nextAppState,
        isFocused,
        wasFocused,
      });

      // Déclencher le callback uniquement quand l'app revient au premier plan
      if (!wasFocused && isFocused) {
        console.log('[useAppFocus] App returned to foreground, triggering callback');
        onFocusChange(true);
      } else if (wasFocused && !isFocused) {
        console.log('[useAppFocus] App went to background');
        onFocusChange(false);
      }

      appStateRef.current = nextAppState;
    };

    subscriptionRef.current = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [onFocusChange]);
};
