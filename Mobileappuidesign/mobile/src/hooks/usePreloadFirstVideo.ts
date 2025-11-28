import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import { useFeed } from '@/src/contexts/FeedContext';

export function usePreloadFirstVideo() {
  const { propertyListings } = useFeed();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    async function preload() {
      if (!propertyListings || propertyListings.length === 0) return;

      const first = propertyListings[0];
      if (!first || !first.media || first.media.length === 0) return;

      const media = first.media[0];
      if (media.type !== 'video') return;

      try {
        const asset = await Asset.fromURI(media.url).downloadAsync();
        setUri(asset.localUri!);
      } catch (e) {
        console.log('[Preload] error', e);
      }
    }

    preload();
  }, [propertyListings]);

  return uri;
}
