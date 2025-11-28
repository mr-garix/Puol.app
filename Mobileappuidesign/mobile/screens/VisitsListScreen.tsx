import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import VisitsScreen, { Visit as VisitCard } from '@/components/VisitsScreen';
import { useVisits } from '@/src/contexts/VisitsContext';
import { getPropertyById } from '@/src/data/properties';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=400&auto=format&fit=crop&q=80';

interface VisitsListScreenProps {
  enableBackNavigation?: boolean;
}

export const VisitsListScreen: React.FC<VisitsListScreenProps> = ({ enableBackNavigation = false }) => {
  const router = useRouter();
  const { visits } = useVisits();

  const mappedVisits = useMemo<VisitCard[]>(
    () =>
      visits.map((visit) => ({
        id: visit.id,
        propertyId: visit.propertyId,
        propertyTitle: visit.propertyTitle,
        propertyImage: visit.propertyImage || FALLBACK_IMAGE,
        propertyLocation: visit.propertyLocation,
        propertyBedrooms: visit.propertyBedrooms ?? getPropertyById(visit.propertyId)?.bedrooms ?? undefined,
        propertyKitchens: visit.propertyKitchens ?? getPropertyById(visit.propertyId)?.kitchens ?? undefined,
        propertyLivingRooms: visit.propertyLivingRooms ?? getPropertyById(visit.propertyId)?.livingRooms ?? undefined,
        propertyType: visit.propertyType ?? getPropertyById(visit.propertyId)?.type,
        propertySurfaceArea: visit.propertySurfaceArea ?? getPropertyById(visit.propertyId)?.surfaceArea,
        propertyIsRoadside:
          visit.propertyIsRoadside ??
          getPropertyById(visit.propertyId)?.amenities?.some((amenity) => amenity.toLowerCase().includes('bord')),
        visitDate: visit.visitDate,
        visitTime: visit.visitTime,
        status: visit.status,
      })),
    [visits],
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="dark-content" />
      <VisitsScreen
        visits={mappedVisits}
        onVisitPress={(id) => router.push({ pathname: '/visits/[id]', params: { id } })}
        onBack={
          enableBackNavigation && router.canGoBack()
            ? () => router.back()
            : undefined
        }
      />
    </SafeAreaView>
  );
};

export default VisitsListScreen;
