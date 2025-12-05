import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import type { AVPlaybackStatus } from 'expo-av';
import { Video, type VideoProps } from 'expo-av';

import { MediaLoadingOverlay } from './MediaLoadingOverlay';

type VideoWithThumbnailProps = {
  videoUrl: string;
  shouldPlay?: boolean;
  reloadKey?: number;
} & Omit<VideoProps, 'source'>;

export const VideoWithThumbnail: React.FC<VideoWithThumbnailProps> = ({
  videoUrl,
  style,
  shouldPlay = true,
  reloadKey = 0,
  ...videoProps
}) => {
  const { onLoad, onLoadStart, onReadyForDisplay, onPlaybackStatusUpdate, ...restVideoProps } = videoProps;
  const videoRef = useRef<Video>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const ref = videoRef.current;
    return () => {
      ref?.stopAsync().catch(() => null);
      ref?.unloadAsync().catch(() => null);
    };
  }, []);

  useEffect(() => {
    setIsLoaded(false);
  }, [reloadKey, videoUrl]);

  // Force immediate playback on Android when shouldPlay changes to true
  useEffect(() => {
    if (shouldPlay && videoRef.current && Platform.OS === 'android') {
      // Small delay to ensure video is ready
      setTimeout(() => {
        videoRef.current?.playAsync().catch(() => null);
      }, 50);
    }
  }, [shouldPlay]);

  const videoStyle = useMemo(() => [styles.media, style], [style]);
  const videoInstanceKey = useMemo(() => `${videoUrl}-${reloadKey}`, [reloadKey, videoUrl]);

  const handleLoadStart = useCallback<NonNullable<VideoProps['onLoadStart']>>(
    (...rest) => {
      setIsLoaded(false);
      onLoadStart?.(...rest);
    },
    [onLoadStart],
  );

  const handleLoad = useCallback<NonNullable<VideoProps['onLoad']>>(
    (...rest) => {
      setIsLoaded(true);
      onLoad?.(...rest);
    },
    [onLoad],
  );

  const handleReadyForDisplay = useCallback<NonNullable<VideoProps['onReadyForDisplay']>>(
    (...rest) => {
      setIsLoaded(true);
      onReadyForDisplay?.(...rest);
    },
    [onReadyForDisplay],
  );

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if ('isLoaded' in status && status.isLoaded) {
        setIsLoaded(true);
      }
      onPlaybackStatusUpdate?.(status);
    },
    [onPlaybackStatusUpdate],
  );

  return (
    <View style={styles.container}>
      <Video
        key={videoInstanceKey}
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={videoStyle}
        shouldPlay={shouldPlay}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onReadyForDisplay={handleReadyForDisplay}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        {...restVideoProps}
      />
      {!isLoaded && <MediaLoadingOverlay />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  media: {
    ...StyleSheet.absoluteFillObject,
  },
});
