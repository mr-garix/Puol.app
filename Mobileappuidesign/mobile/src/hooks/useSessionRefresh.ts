import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase } from '@/src/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';
import { useFeed } from '@/src/contexts/FeedContext';
import { useReservations } from '@/src/contexts/ReservationContext';
import { useVisits } from '@/src/contexts/VisitsContext';

const SESSION_VALIDATION_INTERVAL_MS = 5 * 60 * 1000;
const BACKGROUND_TIMEOUT_MS = 15 * 60 * 1000;

export const useSessionRefresh = () => {
  const { refreshProfile, supabaseUser } = useAuth();
  const { refreshListings, propertyListings, isLoadingListings } = useFeed();
  const { refreshReservations, reservations, isLoading: isLoadingReservations } = useReservations();
  const { refreshVisits, visits, isLoading: isLoadingVisits } = useVisits();
  
  const appStateRef = useRef<AppStateStatus>('active');
  const lastValidationRef = useRef<number>(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);
  const validationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRecoveryTriggeredRef = useRef(false);
  const coldStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldForceRecovery = useCallback(() => {
    if (!supabaseUser) {
      return false;
    }

    const feedEmpty = propertyListings.length === 0 && !isLoadingListings;
    const reservationsEmpty = reservations.length === 0 && !isLoadingReservations;
    const visitsEmpty = visits.length === 0 && !isLoadingVisits;

    return feedEmpty && reservationsEmpty && visitsEmpty;
  }, [isLoadingListings, isLoadingReservations, isLoadingVisits, propertyListings.length, reservations.length, supabaseUser, visits.length]);

  const validateAndRefreshSession = useCallback(async () => {
    try {
      console.log('[useSessionRefresh] 🔄 Validating session...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[useSessionRefresh] ❌ Session validation error:', sessionError);
        return false;
      }

      if (!session) {
        console.warn('[useSessionRefresh] ⚠️ No active session found');
        return false;
      }

      console.log('[useSessionRefresh] ✅ Session valid');
      lastValidationRef.current = Date.now();
      return true;
    } catch (error) {
      console.error('[useSessionRefresh] ❌ Unexpected error during validation:', error);
      return false;
    }
  }, []);

  const revalidateAndRefresh = useCallback(async () => {
    try {
      console.log('[useSessionRefresh] 🚀 Starting revalidation and refresh...');
      
      const isValid = await validateAndRefreshSession();
      
      if (!isValid) {
        console.warn('[useSessionRefresh] ⚠️ Session invalid, attempting recovery...');
        return;
      }

      console.log('[useSessionRefresh] 📊 Refreshing all pages: profile, feed, reservations, visits...');
      
      // Rafraîchir toutes les pages principales en parallèle
      const refreshPromises = [
        refreshProfile().catch(err => console.error('[useSessionRefresh] ❌ Error refreshing profile:', err)),
        refreshListings().catch(err => console.error('[useSessionRefresh] ❌ Error refreshing feed:', err)),
        refreshReservations().catch(err => console.error('[useSessionRefresh] ❌ Error refreshing reservations:', err)),
        refreshVisits().catch(err => console.error('[useSessionRefresh] ❌ Error refreshing visits:', err)),
      ];
      
      await Promise.all(refreshPromises);
      
      console.log('[useSessionRefresh] ✅ Revalidation and refresh complete for all pages');
    } catch (error) {
      console.error('[useSessionRefresh] ❌ Error during revalidation:', error);
    }
  }, [validateAndRefreshSession, refreshProfile, refreshListings, refreshReservations, refreshVisits]);

  const attemptAutoRecovery = useCallback(
    async (reason: string) => {
      if (autoRecoveryTriggeredRef.current) {
        return;
      }

      if (!shouldForceRecovery()) {
        return;
      }

      autoRecoveryTriggeredRef.current = true;
      console.log(`[useSessionRefresh] 🩺 Auto-recovery (${reason}) : données vides détectées, forçage du refresh...`);

      try {
        await revalidateAndRefresh();
      } catch (error) {
        console.error('[useSessionRefresh] ❌ Auto-recovery error:', error);
      } finally {
        // Laisser une fenêtre de 15s avant de permettre un autre auto-recovery pour éviter les boucles
        setTimeout(() => {
          autoRecoveryTriggeredRef.current = false;
        }, 15_000);
      }
    },
    [revalidateAndRefresh, shouldForceRecovery]
  );

  // Vérification de cold start : si tout est vide après le montage initial, on force un refresh
  useEffect(() => {
    if (!supabaseUser) {
      return;
    }

    if (coldStartTimeoutRef.current) {
      clearTimeout(coldStartTimeoutRef.current);
    }

    coldStartTimeoutRef.current = setTimeout(() => {
      void attemptAutoRecovery('cold_start');
    }, 4_000);

    return () => {
      if (coldStartTimeoutRef.current) {
        clearTimeout(coldStartTimeoutRef.current);
      }
    };
  }, [attemptAutoRecovery, supabaseUser]);

  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log('[useSessionRefresh] 📱 AppState changed:', {
        from: previousAppState,
        to: nextAppState,
      });

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[useSessionRefresh] 🔌 App went to background/inactive');

        // Marquer le départ en arrière-plan même si l'OS ne passe pas par "background" (cas Expo Go / DevClient)
        if (!backgroundTimeRef.current) {
          backgroundTimeRef.current = Date.now();
        }

        return;
      }

      if (nextAppState === 'active') {
        console.log('[useSessionRefresh] ⚡ App came to foreground');

        if (backgroundTimeRef.current) {
          const backgroundDuration = Date.now() - backgroundTimeRef.current;
          console.log('[useSessionRefresh] ⏱️ Background duration:', backgroundDuration, 'ms');

          if (backgroundDuration > BACKGROUND_TIMEOUT_MS) {
            console.log('[useSessionRefresh] ⚠️ Long background detected (inactive/background), revalidating...');
            await revalidateAndRefresh();
          } else {
            // Si pas de long background mais données toujours vides, tenter une récupération
            void attemptAutoRecovery('foreground_short_inactive');
          }
        }

        backgroundTimeRef.current = null;
      }
    },
    [attemptAutoRecovery, revalidateAndRefresh]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  useEffect(() => {
    if (!supabaseUser) {
      console.log('[useSessionRefresh] No user, skipping periodic validation');
      return;
    }

    validationIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastValidation = now - lastValidationRef.current;

      if (timeSinceLastValidation >= SESSION_VALIDATION_INTERVAL_MS) {
        console.log('[useSessionRefresh] ⏰ Periodic validation triggered');
        await revalidateAndRefresh();
      }
    }, SESSION_VALIDATION_INTERVAL_MS);

    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
    };
  }, [supabaseUser, revalidateAndRefresh]);

  return {
    validateAndRefreshSession,
    revalidateAndRefresh,
  };
};
