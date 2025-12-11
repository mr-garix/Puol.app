import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import VisitsScreen, { Visit as VisitCard } from '@/src/features/host/components/VisitsScreen';
import { useVisits } from '@/src/contexts/VisitsContext';
import { getPropertyById } from '@/src/data/properties';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=400&auto=format&fit=crop&q=80';

export default function VisitsListScreen() {
  const router = useRouter();
  const { visits, isLoading, error, refreshVisits } = useVisits();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshVisits();
    }, [refreshVisits]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshVisits();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshVisits]);

  const mappedVisits = useMemo<VisitCard[]>(
    () =>
      visits.map((visit) => {
        const propertyData = getPropertyById(visit.propertyId);
        const bedrooms = visit.propertyBedrooms ?? propertyData?.bedrooms;
        const kitchens = visit.propertyKitchens ?? propertyData?.kitchens;
        const livingRooms = visit.propertyLivingRooms ?? propertyData?.livingRooms;
        const type = visit.propertyType ?? propertyData?.type;
        const surfaceArea = visit.propertySurfaceArea ?? propertyData?.surfaceArea;
        const isRoadside = visit.propertyIsRoadside ?? propertyData?.amenities?.some((amenity) => amenity.toLowerCase().includes('bord'));

        return {
          id: visit.id,
          propertyId: visit.propertyId,
          propertyTitle: visit.propertyTitle,
          propertyImage: visit.propertyImage || FALLBACK_IMAGE,
          propertyLocation: visit.propertyLocation,
          propertyBedrooms: bedrooms ?? undefined,
          propertyKitchens: kitchens ?? undefined,
          propertyLivingRooms: livingRooms ?? undefined,
          propertyType: type,
          propertySurfaceArea: surfaceArea,
          propertyIsRoadside: isRoadside ?? undefined,
          visitDate: visit.visitDate,
          visitTime: visit.visitTime,
          status: visit.status,
        };
      }),
    [visits],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" />
      {error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Impossible de charger vos visites</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
            Vérifiez votre connexion Internet puis réessayez.
          </Text>
          <TouchableOpacity
            style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, backgroundColor: '#2ECC71' }}
            onPress={handleRefresh}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {isLoading && visits.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#2ECC71" />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1 }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#2ECC71" />}
            >
              <VisitsScreen
                visits={mappedVisits}
                onVisitPress={(id) => router.push({ pathname: '/visits/[id]', params: { id } })}
                onBack={router.canGoBack() ? router.back : undefined}
              />
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
