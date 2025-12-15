import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, type ImageSourcePropType } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

type TabRouteName = 'home' | 'visits' | 'favorites' | 'profile';

const TAB_CONFIG: Record<TabRouteName, { label: string; icon: ImageSourcePropType }> = {
  home: {
    label: 'Accueil',
    icon: require('@/assets/icons/home.png'),
  },
  visits: {
    label: 'Visites',
    icon: require('@/assets/icons/visits.png'),
  },
  favorites: {
    label: 'Favoris',
    icon: require('@/assets/icons/favorites.png'),
  },
  profile: {
    label: 'Profil',
    icon: require('@/assets/icons/profile.png'),
  },
};

const ROUTE_ORDER: TabRouteName[] = ['home', 'visits', 'favorites', 'profile'];
const PLUS_ICON: ImageSourcePropType = require('@/assets/icons/plus.png');
const PUOL_GREEN = '#2ECC71';

const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const orderedRoutes = ROUTE_ORDER.map((name) =>
    state.routes.find((route) => route.name === name),
  ).filter((route): route is typeof state.routes[number] => Boolean(route));

  const handleTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName as never);
    }
  };

  const handleFabPress = () => {
    router.push('/publish' as never);
  };

  const adjustedPaddingBottom = Math.max(insets.bottom - 20, 6);

  return (
    <View style={[styles.container, { paddingBottom: adjustedPaddingBottom }]}>
      {orderedRoutes.map((route, index) => {
        const config = TAB_CONFIG[route.name as TabRouteName];
        const isFocused = state.index === state.routes.indexOf(route);

        const tabButton = (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            activeOpacity={0.85}
            onPress={() => handleTabPress(route.name, route.key, isFocused)}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel}
          >
            <View style={styles.iconWrapper}>
              <Image
                source={config.icon}
                style={[styles.icon, isFocused && styles.iconActive]}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>{config.label}</Text>
          </TouchableOpacity>
        );

        return (
          <React.Fragment key={route.key}>
            {tabButton}
            {index === 1 && (
              <TouchableOpacity
                key="plus"
                style={styles.plusWrapper}
                activeOpacity={0.9}
                onPress={handleFabPress}
              >
                <Image source={PLUS_ICON} style={styles.plusIcon} resizeMode="contain" />
              </TouchableOpacity>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 5,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  icon: {
    width: 22,
    height: 22,
    tintColor: '#9CA3AF',
  },
  iconActive: {
    tintColor: PUOL_GREEN,
  },
  label: {
    fontSize: 11,
    color: '#6B7280',
  },
  labelActive: {
    color: PUOL_GREEN,
    fontWeight: '600',
  },
  plusWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  plusIcon: {
    width: 72,
    height: 72,
  },
});

export default BottomTabBar;
