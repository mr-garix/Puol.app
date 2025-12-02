import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NotificationBannerProps = {
  title: string;
  message: string;
  onPress: () => void;
  onDismiss: () => void;
};

const NotificationBanner: React.FC<NotificationBannerProps> = ({ title, message, onPress, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();

    return () => {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 180,
        useNativeDriver: true,
      }).start();
    };
  }, [translateY]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { paddingTop: insets.top + 12, transform: [{ translateY }] }]}
    >
      <TouchableOpacity activeOpacity={0.9} style={styles.banner} onPress={onPress}>
        <View style={styles.indicator} />
        <View style={styles.textWrapper}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  banner: {
    width: '92%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  indicator: {
    width: 8,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  message: {
    fontSize: 13,
    color: '#4B5563',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  closeText: {
    fontSize: 18,
    color: '#0F172A',
    lineHeight: 18,
  },
});

export default NotificationBanner;
