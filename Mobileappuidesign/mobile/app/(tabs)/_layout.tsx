import { Tabs } from 'expo-router';
import React from 'react';

import BottomTabBar from '@/components/navigation/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="visits" options={{ title: 'Visites' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favoris' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
