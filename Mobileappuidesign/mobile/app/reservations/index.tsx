import React from 'react';
import { useRouter } from 'expo-router';

import ReservationsListScreen from '@/components/reservations/ReservationsListScreen';

export default function ReservationsIndexRoute() {
  const router = useRouter();
  const canGoBack = router.canGoBack();

  return (
    <ReservationsListScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onReservationPress={(id) =>
        router.push({ pathname: '/reservations/[id]' as const, params: { id } })
      }
    />
  );
}
