import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import VisitDetailsScreen from '@/components/VisitDetailsScreen';
import { useVisits } from '@/src/contexts/VisitsContext';

const VisitDetailsRoute = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { getVisitById } = useVisits();

  if (!id) {
    router.replace('/(tabs)/visits');
    return null;
  }

  const visit = getVisitById(id);

  if (!visit) {
    router.replace('/(tabs)/visits');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color="#2ECC71" />
      </View>
    );
  }

  return <VisitDetailsScreen visit={visit} onBack={() => router.back()} />;
};

export default VisitDetailsRoute;
