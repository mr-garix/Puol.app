import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  disabled = false,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, disabled, activeOpacity: 0.7 } : {};

  return (
    <Container
      style={[styles.container, disabled && styles.disabled, style]}
      {...containerProps}
    >
      {leftIcon && (
        <Feather
          name={leftIcon}
          size={20}
          color="#6B7280"
          style={styles.leftIcon}
        />
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, disabled && styles.disabledText, titleStyle]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, disabled && styles.disabledText, subtitleStyle]}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightIcon && (
        <Feather
          name={rightIcon}
          size={20}
          color="#9CA3AF"
          style={styles.rightIcon}
        />
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  disabled: {
    opacity: 0.5,
  },
  leftIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  rightIcon: {
    marginLeft: 12,
  },
});
