import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  style,
  textStyle,
}) => {
  const badgeStyle = [
    styles.badge,
    styles[variant],
    styles[size],
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <View style={badgeStyle}>
      {icon && (
        <Feather
          name={icon}
          size={size === 'small' ? 12 : size === 'medium' ? 14 : 16}
          style={styles.icon}
        />
      )}
      <Text style={textStyleCombined}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  success: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  warning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  error: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  info: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    fontFamily: 'Manrope',
    fontWeight: '600',
  },
  defaultText: {
    color: '#374151',
  },
  successText: {
    color: '#15803D',
  },
  warningText: {
    color: '#92400E',
  },
  errorText: {
    color: '#B91C1C',
  },
  infoText: {
    color: '#075985',
  },
  smallText: {
    fontSize: 11,
  },
  mediumText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 14,
  },
  icon: {
    marginRight: 2,
  },
});
