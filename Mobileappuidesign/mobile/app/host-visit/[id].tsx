import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar as RNStatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHostVisits } from '@/src/features/host/hooks/useHostVisits';
import type { VisitRecord } from '@/src/contexts/VisitsContext';
import { VisitDetailsScreen } from '@/src/features/host/components/VisitDetailsScreen';

export default function HostVisitDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { getVisitById, fetchVisit, isLoading } = useHostVisits();
  const [isFetching, setIsFetching] = useState(false);

  const visit = id ? getVisitById(id) : undefined;
  const mappedVisit: VisitRecord | undefined = useMemo(() => {
    if (!visit) return undefined;
    return {
      id: visit.id,
      propertyId: visit.listingId,
      propertyTitle: visit.listingTitle,
      propertyImage: visit.listingCoverUrl ?? undefined,
      propertyLocation: visit.listingLocation,
      propertyBedrooms: undefined,
      propertyKitchens: undefined,
      propertyLivingRooms: undefined,
      propertyType: undefined,
      propertySurfaceArea: undefined,
      propertyIsRoadside: undefined,
      visitDate: visit.visitDate,
      visitTime: visit.visitTime,
      status: visit.status,
      rawStatus: visit.rawStatus,
      amount: 0,
      createdAt: visit.createdAt,
      source: visit.source,
      notes: visit.notes,
      guest: visit.guest,
      host: undefined,
    };
  }, [visit]);

  useEffect(() => {
    if (!id) {
      router.replace('/host-visits' as never);
      return;
    }
    if (visit) return;
    setIsFetching(true);
    fetchVisit(id)
      .catch((error) => {
        console.error('[HostVisitDetailsRoute] Unable to fetch visit', error);
      })
      .finally(() => setIsFetching(false));
  }, [id, visit, fetchVisit, router]);

  const isBusy = (isLoading && !mappedVisit) || isFetching;

  if (!id) {
    return null;
  }

  if (isBusy) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 6 }]}>
        <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={styles.centered}>
          <ActivityIndicator color="#16A34A" size="large" />
          <Text style={styles.centeredText}>Chargement de la visite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!mappedVisit) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 6 }]}>
        <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={26} color="#EF4444" />
          <Text style={styles.centeredText}>Cette visite n’existe pas ou n’est plus disponible.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/host-visits' as never)} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retourner à la liste</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <VisitDetailsScreen visit={mappedVisit} onBack={() => router.back()} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  centeredText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  retryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
