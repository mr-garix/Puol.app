import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';

const LOGO_MODULE = require('../../assets/icons/logo.png');
const LOGO_ASSET = Asset.fromModule(LOGO_MODULE);

let cachedLogoUri: string | null = LOGO_ASSET.localUri ?? LOGO_ASSET.uri ?? null;
let logoPrefetchPromise: Promise<string | null> | null = null;

const prefetchLogo = (): Promise<string | null> => {
  if (cachedLogoUri) {
    return Promise.resolve(cachedLogoUri);
  }

  if (!logoPrefetchPromise) {
    logoPrefetchPromise = LOGO_ASSET.downloadAsync()
      .then((asset) => {
        cachedLogoUri = asset.localUri ?? asset.uri ?? cachedLogoUri;
        return cachedLogoUri;
      })
      .catch(() => {
        logoPrefetchPromise = null;
        return cachedLogoUri;
      });
  }

  return logoPrefetchPromise;
};

export const MediaLoadingOverlay = memo(() => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [logoUri, setLogoUri] = useState<string | null>(cachedLogoUri);

  useEffect(() => {
    let isMounted = true;
    prefetchLogo()
      .then((uri) => {
        if (isMounted && uri) {
          setLogoUri(uri);
        }
      })
      .catch(() => null);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    pulseAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [pulseAnim]);

  const animatedOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const imageSource = logoUri ? { uri: logoUri } : LOGO_MODULE;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.Image
        source={imageSource}
        style={[styles.logo, { opacity: animatedOpacity }]}
        resizeMode="contain"
        blurRadius={4}
      />
    </View>
  );
});

MediaLoadingOverlay.displayName = 'MediaLoadingOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 92,
    height: 92,
    zIndex: 2,
  },
});
