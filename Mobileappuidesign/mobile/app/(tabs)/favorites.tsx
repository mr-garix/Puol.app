import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';

import FavoritesScreen from '@/src/features/listings/components/FavoritesScreen';
import { useFeed } from '@/src/contexts/FeedContext';

export default function FavoritesTabScreen() {
  const router = useRouter();
  const { favoriteProperties, likedPropertyIds, toggleLike } = useFeed();

  const handlePropertyPress = useCallback(
    (propertyId: string) => {
      router.push({ pathname: '/property/[id]', params: { id: propertyId } });
    },
    [router],
  );

  return (
    <FavoritesScreen
      likedPropertyIds={likedPropertyIds}
      properties={favoriteProperties}
      onPropertyPress={handlePropertyPress}
      onToggleLike={toggleLike}
    />
  );
}
