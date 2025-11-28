import { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

import NotificationHost from '@/components/notifications/NotificationHost';
import VisitNotificationBridge from '@/components/notifications/VisitNotificationBridge';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationProvider } from '@/src/contexts/NotificationContext';
import { ReservationProvider } from '@/src/contexts/ReservationContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { FeedProvider } from '@/src/contexts/FeedContext';
import { VisitsProvider } from '@/src/contexts/VisitsContext';
import { ProfileProvider } from '@/src/contexts/ProfileContext';
import { PreloadProvider, usePreloadedVideo } from '@/src/contexts/PreloadContext';
import { usePreloadFirstVideo } from '@/src/hooks/usePreloadFirstVideo';

export const unstable_settings = {
  anchor: '(tabs)',
};

function PreloadManager() {
  const localUri = usePreloadFirstVideo();
  const { setPreloadedVideoUri } = usePreloadedVideo();
  const hasPreventedRef = useRef(false);
  const hasHiddenRef = useRef(false);

  useEffect(() => {
    if (!hasPreventedRef.current) {
      hasPreventedRef.current = true;
      SplashScreen.preventAutoHideAsync().catch(() => null);
    }
  }, []);

  useEffect(() => {
    const hideSplashOnce = () => {
      if (hasHiddenRef.current) {
        return;
      }
      hasHiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => null);
    };

    if (localUri) {
      setPreloadedVideoUri(localUri);
      hideSplashOnce();
      return;
    }

    const timeout = setTimeout(() => {
      hideSplashOnce();
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [localUri, setPreloadedVideoUri]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PreloadProvider>
      <AuthProvider>
        <VisitsProvider>
          <FeedProvider>
            <PreloadManager />
            <ReservationProvider>
              <ProfileProvider>
                <NotificationProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                    <Stack.Screen name="search" options={{ headerShown: false }} />
                    <Stack.Screen name="host" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord" options={{ headerShown: false }} />
                    <Stack.Screen name="host-dashboard" options={{ headerShown: false }} />
                    <Stack.Screen name="host-finances" options={{ headerShown: false }} />
                    <Stack.Screen name="host-likes" options={{ headerShown: false }} />
                    <Stack.Screen name="host-comments" options={{ headerShown: false }} />
                    <Stack.Screen name="host-reservations" options={{ headerShown: false }} />
                    <Stack.Screen name="host-reservations/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="host-listings" options={{ headerShown: false }} />
                    <Stack.Screen name="host-visits" options={{ headerShown: false }} />
                    <Stack.Screen name="host-messages" options={{ headerShown: false }} />
                    <Stack.Screen name="host-reviews" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                    <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                    <Stack.Screen name="property/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                    <Stack.Screen name="visits/index" options={{ headerShown: false }} />
                    <Stack.Screen name="visits/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="reservations/index" options={{ headerShown: false }} />
                    <Stack.Screen name="reservations/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="messages/index" options={{ headerShown: false }} />
                    <Stack.Screen name="messages/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="likes/index" options={{ headerShown: false }} />
                    <Stack.Screen name="comments/index" options={{ headerShown: false }} />
                    <Stack.Screen name="contents/index" options={{ headerShown: false }} />
                    <Stack.Screen name="listings/index" options={{ headerShown: false }} />
                    <Stack.Screen name="reviews/index" options={{ headerShown: false }} />
                    <Stack.Screen name="support/index" options={{ headerShown: false }} />
                    <Stack.Screen name="support/[id]" options={{ headerShown: false }} />
                    </Stack>
                    <VisitNotificationBridge />
                    <NotificationHost />
                  </ThemeProvider>
                </NotificationProvider>
              </ProfileProvider>
            </ReservationProvider>
          </FeedProvider>
        </VisitsProvider>
      </AuthProvider>
    </PreloadProvider>
  );
}
