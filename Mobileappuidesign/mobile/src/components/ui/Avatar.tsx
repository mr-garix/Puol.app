import React from 'react';
import { Image, StyleSheet, View, Text, ViewStyle, ImageStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'circle' | 'square';
  fallback?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'medium',
  variant = 'circle',
  fallback,
  style,
}) => {
  const containerStyle = [
    styles.container,
    styles[size],
    styles[variant],
    style,
  ];

  const imageStyle = [
    styles.image,
    styles[size],
    styles[variant],
  ];

  const initials = name
    ? name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : fallback || 'U';

  if (source) {
    return (
      <View style={containerStyle}>
        <Image
          source={source}
          style={imageStyle}
          onError={() => {
            // En cas d'erreur de chargement, on pourrait afficher les initiales
            console.log('[Avatar] Error loading image');
          }}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, styles.fallback]}>
      <Text style={[styles.fallbackText, styles[`${size}Text`]]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  circle: {
    borderRadius: 999,
  },
  square: {
    borderRadius: 12,
  },
  small: {
    width: 32,
    height: 32,
  },
  medium: {
    width: 40,
    height: 40,
  },
  large: {
    width: 48,
    height: 48,
  },
  xlarge: {
    width: 64,
    height: 64,
  },
  fallback: {
    backgroundColor: '#E5E7EB',
  },
  fallbackText: {
    fontFamily: 'Manrope',
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  xlargeText: {
    fontSize: 20,
  },
});
