import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/src/contexts/AuthContext';
import { fetchProfileSummaries } from '@/src/features/profiles/services/profileSummaries';
import {
  cancelRentalVisit,
  checkRentalVisitAvailability,
  createRentalVisit,
  fetchGuestRentalVisits,
  fetchOccupiedTimeslots,
  fetchExistingVisitForListing,
  fetchListingUnavailableDates,
  updateRentalVisit,
  type GuestRentalVisit,
  type RentalVisitStatus,
} from '@/src/features/rental-visits/services';
import { supabase } from '@/src/supabaseClient';

export type VisitStatus = RentalVisitStatus;

export interface VisitRecord {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyLocation: string;
  propertyBedrooms?: number | null;
  propertyKitchens?: number | null;
  propertyLivingRooms?: number | null;
  propertyType?: string | null;
  propertySurfaceArea?: string | null;
  propertyIsRoadside?: boolean | null;
  visitDate: string;
  visitTime: string;
  status: VisitStatus;
  rawStatus: VisitStatus;
  amount: number;
  createdAt: string;
  source?: string | null;
  notes?: string | null;
  guest?: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  host?: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
}

type VisitInput = {
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyLocation: string;
  propertyBedrooms?: number | null;
  propertyKitchens?: number | null;
  propertyLivingRooms?: number | null;
  propertyType?: string | null;
  propertySurfaceArea?: string | null;
  propertyIsRoadside?: boolean | null;
  visitDate: Date;
  visitTime: string;
  amount: number;
  notes?: string | null;
};

type VisitUpdateInput = Partial<Omit<VisitInput, 'visitDate' | 'visitTime'>> & {
  visitDate?: Date;
  visitTime?: string;
};

interface VisitsContextValue {
  visits: VisitRecord[];
  isLoading: boolean;
  error: string | null;
  refreshVisits: () => Promise<void>;
  addVisit: (visit: VisitInput) => Promise<VisitRecord>;
  updateVisit: (visitId: string, data: VisitUpdateInput) => Promise<VisitRecord | null>;
  cancelVisit: (visitId: string) => Promise<VisitRecord | null>;
  confirmVisit: (visitId: string) => void;
  getVisitByPropertyId: (propertyId: string) => VisitRecord | undefined;
  getVisitById: (visitId: string) => VisitRecord | undefined;
  checkSlotAvailability: (listingId: string, visitDate: string, visitTime: string) => Promise<boolean>;
  getOccupiedTimeslots: (listingId: string, visitDate: string) => Promise<string[]>;
  getUnavailableVisitDates: (listingId: string, startDate: string, endDate: string) => Promise<string[]>;
  fetchLatestVisitForListing: (listingId: string) => Promise<VisitRecord | null>;
}

const AUTO_CONFIRM_DELAY_MS = 2 * 60 * 1000;
const DEFAULT_VISIT_PRICE = 5000;

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

const mapGuestVisitToRecord = (
  visit: GuestRentalVisit,
  extras?: Partial<VisitRecord>,
  previous?: VisitRecord,
): VisitRecord => {
  return {
    id: visit.id,
    propertyId: visit.listingId,
    propertyTitle: extras?.propertyTitle ?? previous?.propertyTitle ?? visit.listingTitle,
    propertyImage: extras?.propertyImage ?? previous?.propertyImage ?? visit.listingCoverUrl ?? null,
    propertyLocation: extras?.propertyLocation ?? previous?.propertyLocation ?? visit.listingLocation,
    propertyBedrooms: extras?.propertyBedrooms ?? previous?.propertyBedrooms ?? null,
    propertyKitchens: extras?.propertyKitchens ?? previous?.propertyKitchens ?? null,
    propertyLivingRooms: extras?.propertyLivingRooms ?? previous?.propertyLivingRooms ?? null,
    propertyType: extras?.propertyType ?? previous?.propertyType ?? null,
    propertySurfaceArea: extras?.propertySurfaceArea ?? previous?.propertySurfaceArea ?? null,
    propertyIsRoadside: extras?.propertyIsRoadside ?? previous?.propertyIsRoadside ?? null,
    visitDate: visit.visitDate,
    visitTime: visit.visitTime,
    status: visit.status,
    rawStatus: visit.rawStatus,
    amount: extras?.amount ?? previous?.amount ?? DEFAULT_VISIT_PRICE,
    createdAt: visit.createdAt,
    source: visit.source ?? previous?.source ?? null,
    notes: visit.notes ?? previous?.notes ?? null,
    guest: visit.guest ?? previous?.guest ?? null,
    host: extras?.host ?? previous?.host ?? null,
  };
};

type VisitExtrasInput = (VisitInput | VisitUpdateInput | Partial<VisitRecord>) & {
  visitDate?: Date | string;
  visitTime?: string;
  amount?: number;
  notes?: string | null;
  host?: VisitRecord['host'];
};

const buildExtrasFromInput = (input: VisitExtrasInput): Partial<VisitRecord> => {
  return {
    propertyId: input.propertyId,
    propertyTitle: input.propertyTitle,
    propertyImage: input.propertyImage,
    propertyLocation: input.propertyLocation,
    propertyBedrooms: input.propertyBedrooms ?? null,
    propertyKitchens: input.propertyKitchens ?? null,
    propertyLivingRooms: input.propertyLivingRooms ?? null,
    propertyType: input.propertyType ?? null,
    propertySurfaceArea: input.propertySurfaceArea ?? null,
    propertyIsRoadside: input.propertyIsRoadside ?? null,
    visitDate: input.visitDate instanceof Date ? input.visitDate.toISOString() : input.visitDate,
    visitTime: input.visitTime ?? undefined,
    amount: input.amount ?? undefined,
    notes: input.notes ?? undefined,
    host: input.host ?? undefined,
  };
};

const buildProfileDisplayName = (firstName?: string | null, lastName?: string | null, username?: string | null) => {
  const tokens = [firstName, lastName].filter((token) => token && token.trim());
  if (tokens.length) {
    return tokens.join(' ');
  }
  return username ? `@${username}` : undefined;
};

const mapHostSummariesToRecord = async (profileIds: (string | undefined)[]) => {
  const validIds = profileIds.filter((id): id is string => Boolean(id));
  if (validIds.length === 0) {
    return {} as Record<string, NonNullable<VisitRecord['host']>>;
  }

  const summaries = await fetchProfileSummaries(validIds);
  const entries = Object.values(summaries).map((summary) => [
    summary.id,
    {
      id: summary.id,
      name: buildProfileDisplayName(summary.firstName, summary.lastName, summary.username),
      username: summary.username,
      phone: summary.phone,
      avatarUrl: summary.avatarUrl,
    },
  ] as const);

  return Object.fromEntries(entries) as Record<string, NonNullable<VisitRecord['host']>>;
};

export const VisitsProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitsRef = useRef<VisitRecord[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = useCallback((visitId: string) => {
    if (timersRef.current[visitId]) {
      clearTimeout(timersRef.current[visitId]);
      delete timersRef.current[visitId];
    }
  }, []);

  const scheduleAutoConfirm = useCallback(
    (visit: VisitRecord) => {
      clearTimer(visit.id);

      if (visit.status !== 'pending') {
        return;
      }

      const createdAt = visit.createdAt ? new Date(visit.createdAt).getTime() : null;
      if (!createdAt) {
        return;
      }

      const elapsed = Date.now() - createdAt;
      const remaining = AUTO_CONFIRM_DELAY_MS - elapsed;

      if (remaining <= 0) {
        setVisits((prev) =>
          prev.map((item) =>
            item.id === visit.id ? { ...item, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' } : item,
          ),
        );

  const getUnavailableVisitDates = useCallback<VisitsContextValue['getUnavailableVisitDates']>(
    async (listingId, startDate, endDate) => {
      try {
        return await fetchListingUnavailableDates({ listingId, startDate, endDate });
      } catch (err) {
        console.error('[VisitsContext] Failed to fetch unavailable dates', err);
        throw err;
      }
    },
    [],
  );
        return;
      }

      timersRef.current[visit.id] = setTimeout(() => {
        setVisits((prev) =>
          prev.map((item) =>
            item.id === visit.id ? { ...item, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' } : item,
          ),
        );
        delete timersRef.current[visit.id];
      }, remaining);
    },
    [clearTimer],
  );

  const applyVisits = useCallback(
    (nextVisits: VisitRecord[]) => {
      setVisits((prevVisits) => {
        const prevIds = new Set(prevVisits.map((visit) => visit.id));
        nextVisits.forEach((visit) => {
          scheduleAutoConfirm(visit);
          prevIds.delete(visit.id);
        });
        prevIds.forEach((id) => clearTimer(id));
        visitsRef.current = nextVisits;
        return nextVisits;
      });
    },
    [clearTimer, scheduleAutoConfirm],
  );

  const getUnavailableVisitDates = useCallback<VisitsContextValue['getUnavailableVisitDates']>(
    async (listingId, startDate, endDate) => {
      try {
        return await fetchListingUnavailableDates({ listingId, startDate, endDate });
      } catch (err) {
        console.error('[VisitsContext] Failed to fetch unavailable dates', err);
        throw err;
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      timersRef.current = {};
    };
  }, []);

  const refreshVisits = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile) {
      applyVisits([]);
      return;
    }

    setIsLoading(true);
    try {
      const fetched = await fetchGuestRentalVisits(supabaseProfile.id);
      const previousIndex = new Map(visitsRef.current.map((visit) => [visit.id, visit] as const));
      const hostMap = await mapHostSummariesToRecord(fetched.map((visit) => visit.landlordProfileId));
      const mapped = fetched
        .map((visit) => {
          const previous = previousIndex.get(visit.id);
          const hostId = visit.landlordProfileId;
          const hostProfile = hostId ? hostMap[hostId] : undefined;
          const extras: Partial<VisitRecord> | undefined = hostProfile ? { host: hostProfile } : undefined;
          return mapGuestVisitToRecord(visit, extras, previous ?? undefined);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      applyVisits(mapped);
      setError(null);
    } catch (err) {
      console.error('[VisitsContext] Failed to refresh visits', err);
      setError('unable_to_load');
    } finally {
      setIsLoading(false);
    }
  }, [applyVisits, isLoggedIn, supabaseProfile]);

  useEffect(() => {
    if (isLoggedIn && supabaseProfile) {
      void refreshVisits();
    } else {
      visitsRef.current = [];
      setVisits([]);
      Object.keys(timersRef.current).forEach((id) => clearTimer(id));
    }
  }, [clearTimer, isLoggedIn, refreshVisits, supabaseProfile]);

  // Listener Supabase Realtime pour les changements de statut des visites
  useEffect(() => {
    if (!supabaseProfile) {
      return;
    }

    const subscription = supabase
      .channel(`rental_visits:guest_profile_id=eq.${supabaseProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rental_visits',
          filter: `guest_profile_id=eq.${supabaseProfile.id}`,
        },
        (payload) => {
          const updatedVisit = payload.new as any;
          if (updatedVisit.status === 'cancelled') {
            // Afficher une notification quand la visite est annulée
            const visit = visitsRef.current.find((v) => v.id === updatedVisit.id);
            if (visit) {
              Alert.alert(
                'Visite annulée',
                `Votre visite prévue le ${new Date(visit.visitDate).toLocaleDateString('fr-FR')} à ${visit.visitTime} a été annulée.\n\nPour plus d'informations, veuillez contacter le support.`,
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
            }
            // Mettre à jour l'état local
            setVisits((prev) =>
              prev.map((v) =>
                v.id === updatedVisit.id
                  ? { ...v, status: 'cancelled' as VisitStatus, rawStatus: 'cancelled' as VisitStatus }
                  : v
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabaseProfile]);

  const addVisit = useCallback<VisitsContextValue['addVisit']>(
    async (visit) => {
      if (!supabaseProfile) {
        throw new Error('not_authenticated');
      }

      const created = await createRentalVisit({
        listingId: visit.propertyId,
        guestProfileId: supabaseProfile.id,
        visitDate: visit.visitDate,
        visitTime: visit.visitTime,
        source: 'mobile_guest',
        notes: visit.notes ?? null,
      });

      const extras = buildExtrasFromInput(visit);
      let host: VisitRecord['host'] | undefined;
      if (created.landlordProfileId) {
        const hostMap = await mapHostSummariesToRecord([created.landlordProfileId]);
        host = hostMap[created.landlordProfileId];
      }

      const record = mapGuestVisitToRecord(created, host ? { ...extras, host } : extras);

      setVisits((prev) => {
        const next = [record, ...prev.filter((item) => item.id !== record.id)];
        scheduleAutoConfirm(record);
        visitsRef.current = next;
        return next;
      });

      // ✅ NOTCHPAY: Paiement géré côté écran via NotchPay
      // La visite est créée en status 'pending' avec payment_status 'pending'
      // L'écran de paiement appellera processVisitPaymentWithNotchPay() pour déclencher le flow NotchPay
      // Le webhook Supabase mettra à jour payments.status (success/failed)
      try {
        console.log('[VisitsContext.addVisit] 🔵 Visit créée en status pending - paiement géré via NotchPay côté écran:', {
          visitId: created.id,
          guestProfileId: supabaseProfile.id,
          hostProfileId: created.landlordProfileId,
          visitDate: created.visitDate,
          visitTime: created.visitTime,
        });

        const { sendVisitNotificationToHost } = await import('@/src/features/rental-visits/services');
        
        // Envoyer la notification au host que la visite a été créée
        console.log('[VisitsContext.addVisit] 📬 Sending notification to host...');

        // Récupérer les données complètes de la visite avec les relations
        console.log('[VisitsContext.addVisit] 📡 Fetching complete visit data with relations...');
        
        const { data: visitData, error: fetchError } = await supabase
          .from('rental_visits')
          .select(`
            id,
            rental_listing_id,
            guest_profile_id,
            visit_date,
            visit_time,
            status,
            source,
            created_at,
            cancelled_at,
            cancelled_reason,
            notes,
            listing:listings (
              id,
              title,
              cover_photo_url,
              city,
              district,
              address_text,
              host_id
            ),
            guest:profiles!rental_visits_guest_profile_id_fkey (
              id,
              first_name,
              last_name,
              username,
              phone,
              avatar_url
            )
          `)
          .eq('id', created.id)
          .single();

        if (fetchError) {
          console.error('[VisitsContext.addVisit] ❌ Error fetching visit data:', fetchError);
        } else {
          console.log('[VisitsContext.addVisit] ✅ Visit data fetched:', {
            visitId: visitData?.id,
            hasListing: !!visitData?.listing,
            hostId: (visitData?.listing as any)?.host_id,
          });
        }

        if (visitData) {
          // Envoyer la notification au host APRÈS le paiement
          console.log('[VisitsContext.addVisit] 🔔 Sending notification to host...');
          
          try {
            await sendVisitNotificationToHost(visitData as any);
            console.log('[VisitsContext.addVisit] ✅ Notification sent successfully to host for visit:', created.id);
          } catch (notificationError) {
            console.error('[VisitsContext.addVisit] ❌ Error sending notification:', notificationError);
          }
        } else {
          console.warn('[VisitsContext.addVisit] ⚠️ No visit data to send notification');
        }
      } catch (paymentError) {
        console.error('[VisitsContext.addVisit] ❌ Error creating payment or sending notification:', {
          error: paymentError,
          message: paymentError instanceof Error ? paymentError.message : 'Unknown error',
          stack: paymentError instanceof Error ? paymentError.stack : undefined,
        });
        // Ne pas échouer la création de visite si le paiement ou la notification échoue
      }

      return record;
    },
    [scheduleAutoConfirm, supabaseProfile],
  );

  const updateVisit = useCallback<VisitsContextValue['updateVisit']>(
    async (visitId, data) => {
      if (!supabaseProfile || (!data.visitDate && !data.visitTime)) {
        throw new Error('invalid_update_payload');
      }

      const current = visits.find((visit) => visit.id === visitId);
      try {
        const updated = await updateRentalVisit({
          visitId,
          newDate: data.visitDate ?? new Date(current?.visitDate ?? new Date().toISOString()),
          newTime: data.visitTime ?? current?.visitTime ?? '11:00',
        });

        const extras = buildExtrasFromInput({ ...(current ?? {}), ...data } as VisitExtrasInput);
        const record = mapGuestVisitToRecord(updated, extras, current);
        setVisits((prev) => {
          const next = prev.map((visit) => (visit.id === record.id ? record : visit));
          scheduleAutoConfirm(record);
          visitsRef.current = next;
          return next;
        });
        return record;
      } catch (err) {
        console.error('[VisitsContext] Failed to update visit', err);
        throw err;
      }
    },
    [scheduleAutoConfirm, supabaseProfile],
  );

  const handleCancelVisit = useCallback<VisitsContextValue['cancelVisit']>(
    async (visitId) => {
      try {
        const cancelled = await cancelRentalVisit(visitId);
        const previous = visitsRef.current.find((visit) => visit.id === visitId);
        const record = mapGuestVisitToRecord(cancelled, undefined, previous);
        clearTimer(visitId);
        setVisits((prev) => {
          const next = prev.map((visit) => (visit.id === visitId ? record : visit));
          visitsRef.current = next;
          return next;
        });
        return record;
      } catch (err) {
        console.error('[VisitsContext] Failed to cancel visit', err);
        throw err;
      }
    },
    [clearTimer],
  );

  const confirmVisit = useCallback((visitId: string) => {
    clearTimer(visitId);
    setVisits((prev) => {
      const next: VisitRecord[] = prev.map((visit) =>
        visit.id === visitId
          ? { ...visit, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' as VisitStatus }
          : visit,
      );
      visitsRef.current = next;
      return next;
    });
  }, [clearTimer]);

  const getVisitByPropertyId = useCallback(
    (propertyId: string) => visits.find((visit) => visit.propertyId === propertyId && visit.status !== 'cancelled'),
    [visits],
  );

  const getVisitById = useCallback((visitId: string) => visits.find((visit) => visit.id === visitId), [visits]);

  const checkSlotAvailability = useCallback<VisitsContextValue['checkSlotAvailability']>(
    async (listingId, visitDate, visitTime) => {
      try {
        return await checkRentalVisitAvailability({ listingId, visitDate, visitTime });
      } catch (err) {
        console.error('[VisitsContext] Failed to check slot availability', err);
        throw err;
      }
    },
    [],
  );

  const getOccupiedTimeslots = useCallback<VisitsContextValue['getOccupiedTimeslots']>(
    async (listingId, visitDate) => {
      try {
        return await fetchOccupiedTimeslots({ listingId, visitDate });
      } catch (err) {
        console.error('[VisitsContext] Failed to fetch occupied timeslots', err);
        throw err;
      }
    },
    [],
  );

  const fetchLatestVisitForListing = useCallback<VisitsContextValue['fetchLatestVisitForListing']>(
    async (listingId) => {
      if (!supabaseProfile) {
        throw new Error('not_authenticated');
      }

      const visit = await fetchExistingVisitForListing(supabaseProfile.id, listingId);
      if (!visit) {
        return null;
      }

      const current = visits.find((item) => item.id === visit.id);
      return mapGuestVisitToRecord(visit, undefined, current);
    },
    [supabaseProfile, visits],
  );

  const value = useMemo<VisitsContextValue>(
    () => ({
      visits,
      isLoading,
      error,
      refreshVisits,
      addVisit,
      updateVisit,
      cancelVisit: handleCancelVisit,
      confirmVisit,
      getVisitByPropertyId,
      getVisitById,
      checkSlotAvailability,
      getOccupiedTimeslots,
      getUnavailableVisitDates,
      fetchLatestVisitForListing,
    }),
    [
      visits,
      isLoading,
      error,
      refreshVisits,
      addVisit,
      updateVisit,
      handleCancelVisit,
      confirmVisit,
      getVisitByPropertyId,
      getVisitById,
      checkSlotAvailability,
      getOccupiedTimeslots,
      getUnavailableVisitDates,
      fetchLatestVisitForListing,
    ],
  );

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
};

export const useVisits = () => {
  const context = useContext(VisitsContext);
  if (!context) {
    throw new Error('useVisits must be used within a VisitsProvider');
  }
  return context;
};

export const useOptionalVisits = () => useContext(VisitsContext);
