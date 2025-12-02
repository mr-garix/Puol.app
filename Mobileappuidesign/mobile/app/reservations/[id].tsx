import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ReservationDetailsScreen from '@/src/features/bookings/components/ReservationDetailsScreen';

export default function ReservationDetailsRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    router.replace('/reservations' as never);
    return null;
  }

  return <ReservationDetailsScreen reservationId={id} onBack={() => router.back()} />;
}
