import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

import { scaleFont } from '../../theme/typography';

interface SplashScreenProps {
  onFinish: () => void;
}

const SPLASH_DURATION = 4500; // 4.5s total
const LOGO_SIZE = 192;
const { width } = Dimensions.get('window');
const BASE_SLOGAN_SIZE = scaleFont(18);
const MIN_SLOGAN_SIZE = Math.max(Math.round(BASE_SLOGAN_SIZE * 0.8), 12);

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const [sloganSize, setSloganSize] = useState(BASE_SLOGAN_SIZE);
  const [allowWrap, setAllowWrap] = useState(false);

  useEffect(() => {
    StatusBar.setHidden(true);

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      delay: 1200,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        StatusBar.setHidden(false);
        onFinish();
      });
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(timer);
      StatusBar.setHidden(false);
    };
  }, [logoOpacity, logoTranslateY, onFinish, screenOpacity, textOpacity]);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar hidden />
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslateY }],
            },
          ]}
        >
          <Image
            source={require('../../../assets/icons/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          numberOfLines={allowWrap ? undefined : 1}
          onTextLayout={(e) => {
            const lines = e.nativeEvent.lines?.length ?? 1;
            if (lines > 1 && !allowWrap) {
              setSloganSize((current) => {
                if (current > MIN_SLOGAN_SIZE) {
                  return Math.max(MIN_SLOGAN_SIZE, current - 1);
                }
                setAllowWrap(true);
                return current;
              });
            }
          }}
          style={[
            styles.slogan,
            {
              opacity: textOpacity,
              fontSize: sloganSize,
              lineHeight: Math.round(sloganSize * 1.2),
            },
          ]}
        >
          Ton prochain chez-toi commence ici.
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontFamily: 'Manrope',
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  slogan: {
    fontFamily: 'Manrope',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
    maxWidth: width * 0.8,
  },
});

export default SplashScreen;
