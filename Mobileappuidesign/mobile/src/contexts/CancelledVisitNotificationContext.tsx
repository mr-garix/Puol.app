import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';

interface CancelledVisitNotificationContextValue {
  // Context for managing cancelled visit notifications
}

const SHOWN_CANCELLED_VISITS_KEY = 'shown_cancelled_visits';

const CancelledVisitNotificationContext = createContext<CancelledVisitNotificationContextValue | undefined>(undefined);

const showCancelledVisitNotification = (visit: any, router: any) => {
  const propertyTitle = visit.property_title || 'Propriété';
  const visitDate = visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('fr-FR') : 'date inconnue';

  Alert.alert(
    'Visite annulée',
    `Votre visite pour ${propertyTitle} prévue le ${visitDate} a été annulée.\n\nPour plus d'informations, veuillez contacter le support.`,
    [
      {
        text: 'OK',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Contacter le support',
        onPress: () => {
          router.push('/support' as never);
        },
        style: 'default',
      },
    ]
  );
};

export const CancelledVisitNotificationProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [shownCancelledVisits, setShownCancelledVisits] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger les notifications affichées depuis le stockage au démarrage
  useEffect(() => {
    const loadShownVisits = async () => {
      const stored = await loadIdsFromStorage(SHOWN_CANCELLED_VISITS_KEY);
      setShownCancelledVisits(stored);
      setIsInitialized(true);
    };
    loadShownVisits();
  }, []);

  // Vérifier les visites annulées passées au démarrage
  useEffect(() => {
    if (!supabaseProfile || !isInitialized) {
      console.log('[CancelledVisitNotificationContext] Waiting for initialization or profile');
      return;
    }

    const checkPastCancelledVisits = async () => {
      try {
        console.log('[CancelledVisitNotificationContext] Checking for past cancelled visits for guest:', supabaseProfile.id);
        console.log('[CancelledVisitNotificationContext] Already shown visits:', Array.from(shownCancelledVisits));
        
        const { data: visits, error } = await (supabase as any)
          .from('guest_rental_visits')
          .select('*')
          .eq('guest_profile_id', supabaseProfile.id)
          .eq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('[CancelledVisitNotificationContext] Error fetching past cancelled visits:', error);
          return;
        }

        if (visits && visits.length > 0) {
          console.log('[CancelledVisitNotificationContext] Found past cancelled visits:', visits.length);
          
          // Afficher les visites annulées non encore affichées
          for (const visit of visits) {
            // Vérifier que la visite appartient bien à l'utilisateur actuel
            if (visit.guest_profile_id !== supabaseProfile.id) {
              console.log('[CancelledVisitNotificationContext] Skipping visit not for current user:', visit.id);
              continue;
            }

            if (!shownCancelledVisits.has(visit.id)) {
              console.log('[CancelledVisitNotificationContext] Showing past cancelled visit notification:', visit.id);
              showCancelledVisitNotification(visit, router);
              const newShownVisits = new Set(shownCancelledVisits);
              newShownVisits.add(visit.id);
              setShownCancelledVisits(newShownVisits);
              // Sauvegarder immédiatement pour éviter les doublons
              await saveIdsToStorage(SHOWN_CANCELLED_VISITS_KEY, newShownVisits);
              // Délai plus long entre les notifications pour éviter les chevauchements
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log('[CancelledVisitNotificationContext] Visit already shown, skipping:', visit.id);
            }
          }
        }
      } catch (error) {
        console.error('[CancelledVisitNotificationContext] Error checking past cancelled visits:', error);
      }
    };

    // Attendre un peu avant de vérifier les visites annulées passées
    const timer = setTimeout(() => {
      checkPastCancelledVisits();
    }, 3000);

    return () => clearTimeout(timer);
  }, [supabaseProfile?.id, isInitialized]);

  // Écouter les annulations de visites en temps réel
  useEffect(() => {
    if (!supabaseProfile) {
      console.log('[CancelledVisitNotificationContext] No supabase profile, skipping realtime subscription');
      return;
    }

    console.log('[CancelledVisitNotificationContext] Setting up realtime subscription for guest:', supabaseProfile.id);
    
    const channel = supabase.channel(`guest-cancelled-visits-${supabaseProfile.id}`);
    
    const subscription = channel
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_rental_visits',
          filter: `guest_profile_id=eq.${supabaseProfile.id}`,
        },
        async (payload: any) => {
          console.log('[CancelledVisitNotificationContext] Realtime visit change received:', {
            eventType: payload.eventType,
            visitId: payload.new?.id,
            status: payload.new?.status,
            currentGuestId: supabaseProfile.id
          });

          try {
            if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'cancelled') {
              const visit = payload.new;
              console.log('[CancelledVisitNotificationContext] Visit cancelled detected:', visit.id);
              
              if (!shownCancelledVisits.has(visit.id)) {
                showCancelledVisitNotification(visit, router);
                setShownCancelledVisits(prev => new Set(prev).add(visit.id));
              }
            }
          } catch (error) {
            console.error('[CancelledVisitNotificationContext] Error processing realtime update:', error);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[CancelledVisitNotificationContext] Subscription status:', status);
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('[CancelledVisitNotificationContext] Subscription error, attempting to resubscribe...');
          channel.unsubscribe();
          channel.subscribe();
        }
      });

    return () => {
      console.log('[CancelledVisitNotificationContext] Cleaning up realtime subscription');
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile?.id, shownCancelledVisits, router]);

  const value: CancelledVisitNotificationContextValue = {};

  return (
    <CancelledVisitNotificationContext.Provider value={value}>
      {children}
    </CancelledVisitNotificationContext.Provider>
  );
};

export const useCancelledVisitNotifications = () => {
  const context = useContext(CancelledVisitNotificationContext);
  if (!context) {
    throw new Error('useCancelledVisitNotifications must be used within a CancelledVisitNotificationProvider');
  }
  return context;
};
