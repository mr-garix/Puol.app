import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import VisitsScreen, { Visit as VisitCard } from '@/src/features/host/components/VisitsScreen';
import { useVisits } from '@/src/contexts/VisitsContext';
import { getPropertyById } from '@/src/data/properties';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=400&auto=format&fit=crop&q=80';

export default function VisitsListScreen() {
  const router = useRouter();
  const { visits } = useVisits();

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
      <VisitsScreen
        visits={mappedVisits}
        onVisitPress={(id) => router.push({ pathname: '/visits/[id]', params: { id } })}
        onBack={router.canGoBack() ? router.back : undefined}
      />
    </SafeAreaView>
  );
}
