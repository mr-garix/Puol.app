import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';

type RefundRow = Database['public']['Tables']['refunds']['Row'];
type RefundRealtimePayload = RealtimePostgresChangesPayload<RefundRow>;

interface RefundNotificationContextValue {
  // Context for managing refund notifications
}

const RefundNotificationContext = createContext<RefundNotificationContextValue | undefined>(undefined);

const showRefundNotification = (refund: any, router: any) => {
  const amount = refund.refund_amount ?? 0;
  const currencyFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
  });

  const reasonLabels: Record<string, string> = {
    'reservation_cancelled': 'Réservation annulée',
    'guest_request': 'Demande du client',
    'damage': 'Dommages',
    'other': 'Autre',
  };

  const reason = reasonLabels[refund.refund_reason] || refund.refund_reason;

  Alert.alert(
    'Remboursement effectué',
    `Un remboursement de ${currencyFormatter.format(amount)} a été effectué.\n\nMotif : ${reason}\n\nPour plus d'informations, veuillez contacter le support.`,
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

const SHOWN_REFUNDS_KEY = 'shown_refunds';

export const RefundNotificationProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [shownRefunds, setShownRefunds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger les notifications affichées depuis le stockage au démarrage
  useEffect(() => {
    const loadShownRefunds = async () => {
      const stored = await loadIdsFromStorage(SHOWN_REFUNDS_KEY);
      setShownRefunds(stored);
      setIsInitialized(true);
    };
    loadShownRefunds();
  }, []);

  // Vérifier les remboursements passés au démarrage
  useEffect(() => {
    if (!supabaseProfile || !isInitialized) {
      console.log('[RefundNotificationContext] Waiting for initialization or profile:', {
        hasProfile: !!supabaseProfile,
        isInitialized,
      });
      return;
    }

    const checkPastRefunds = async () => {
      try {
        console.log('[RefundNotificationContext] Checking for past refunds for guest:', supabaseProfile.id);
        console.log('[RefundNotificationContext] Already shown refunds:', Array.from(shownRefunds));
        
        const { data: refunds, error } = await (supabase as any)
          .from('refunds')
          .select('id, guest_profile_id, refund_amount, refund_reason, status, requested_at, payment_method, phone_number')
          .eq('guest_profile_id', supabaseProfile.id)
          .order('requested_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('[RefundNotificationContext] Error fetching past refunds:', error);
          return;
        }

        if (refunds && refunds.length > 0) {
          console.log('[RefundNotificationContext] Found past refunds:', refunds.length);
          
          // Afficher les remboursements non encore affichés
          for (const refund of refunds) {
            // Vérifier que le remboursement appartient bien à l'utilisateur actuel
            if (refund.guest_profile_id !== supabaseProfile.id) {
              console.log('[RefundNotificationContext] Skipping refund not for current user:', refund.id);
              continue;
            }

            if (!shownRefunds.has(refund.id)) {
              console.log('[RefundNotificationContext] Showing past refund notification:', refund.id);
              showRefundNotification(refund, router);
              const newShownRefunds = new Set(shownRefunds);
              newShownRefunds.add(refund.id);
              setShownRefunds(newShownRefunds);
              // Sauvegarder immédiatement pour éviter les doublons
              await saveIdsToStorage(SHOWN_REFUNDS_KEY, newShownRefunds);
              // Délai plus long entre les notifications pour éviter les chevauchements
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log('[RefundNotificationContext] Refund already shown, skipping:', refund.id);
            }
          }
        }
      } catch (error) {
        console.error('[RefundNotificationContext] Error checking past refunds:', error);
      }
    };

    // Attendre un peu avant de vérifier les remboursements passés
    const timer = setTimeout(() => {
      checkPastRefunds();
    }, 1000);

    return () => clearTimeout(timer);
  }, [supabaseProfile?.id, isInitialized]);

  useEffect(() => {
    if (!supabaseProfile) {
      console.log('[RefundNotificationContext] No supabase profile, skipping realtime subscription');
      return;
    }

    console.log('[RefundNotificationContext] Setting up realtime subscription for guest:', supabaseProfile.id);
    
    const channel = supabase.channel(`guest-refunds-${supabaseProfile.id}`);
    
    const subscription = channel
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'refunds',
          filter: `guest_profile_id=eq.${supabaseProfile.id}`,
        },
        async (payload: any) => {
          console.log('[RefundNotificationContext] Realtime refund change received:', {
            eventType: payload.eventType,
            refundId: payload.new?.id,
            status: payload.new?.status,
            currentGuestId: supabaseProfile.id
          });

          try {
            if (payload.eventType === 'INSERT' && payload.new) {
              const refund = payload.new;
              console.log('[RefundNotificationContext] New refund detected:', refund.id);
              
              // Vérifier que le remboursement appartient à l'utilisateur actuel
              if (refund.guest_profile_id !== supabaseProfile.id) {
                console.log('[RefundNotificationContext] Refund not for current user, skipping:', refund.id);
                return;
              }
              
              if (!shownRefunds.has(refund.id)) {
                showRefundNotification(refund, router);
                const newShownRefunds = new Set(shownRefunds);
                newShownRefunds.add(refund.id);
                setShownRefunds(newShownRefunds);
                // Sauvegarder immédiatement
                await saveIdsToStorage(SHOWN_REFUNDS_KEY, newShownRefunds);
              }
            }
          } catch (error) {
            console.error('[RefundNotificationContext] Error processing realtime update:', error);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[RefundNotificationContext] Subscription status:', status);
        
        // Si la connexion est perdue, on essaie de se reconnecter
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('[RefundNotificationContext] Subscription error, attempting to resubscribe...');
          channel.unsubscribe();
          channel.subscribe();
        }
      });

    // Nettoyage de l'effet
    return () => {
      console.log('[RefundNotificationContext] Cleaning up realtime subscription');
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile, router]);

  const value: RefundNotificationContextValue = {};

  return (
    <RefundNotificationContext.Provider value={value}>
      {children}
    </RefundNotificationContext.Provider>
  );
};

export const useRefundNotifications = () => {
  const context = useContext(RefundNotificationContext);
  if (!context) {
    throw new Error('useRefundNotifications must be used within a RefundNotificationProvider');
  }
  return context;
};
