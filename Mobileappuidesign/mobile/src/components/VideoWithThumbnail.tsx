import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Video, type VideoProps } from 'expo-av';

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
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    const ref = videoRef.current;
    return () => {
      ref?.stopAsync().catch(() => null);
      ref?.unloadAsync().catch(() => null);
    };
  }, []);

  const videoStyle = useMemo(() => [styles.media, style], [style]);
  const videoInstanceKey = useMemo(() => `${videoUrl}-${reloadKey}`, [reloadKey, videoUrl]);

  return (
    <View style={styles.container}>
      <Video
        key={videoInstanceKey}
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={videoStyle}
        shouldPlay={shouldPlay}
        {...videoProps}
      />
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
