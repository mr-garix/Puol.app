import { useEffect, useRef, useState } from 'react';
import { StatusBar as NativeStatusBar, useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Asset } from 'expo-asset';

import VisitNotificationBridge from '@/src/infrastructure/notifications/VisitNotificationBridge';
import HostBookingNotificationBridge from '@/src/infrastructure/notifications/HostBookingNotificationBridge';
import HostCommentNotificationBridge from '@/src/infrastructure/notifications/HostCommentNotificationBridge';
import UserCommentNotificationBridge from '@/src/infrastructure/notifications/UserCommentNotificationBridge';
import HostReviewNotificationBridge from '@/src/infrastructure/notifications/HostReviewNotificationBridge';
import UserReviewReplyNotificationBridge from '@/src/infrastructure/notifications/UserReviewReplyNotificationBridge';
import NotificationHost from '@/src/infrastructure/notifications/NotificationHost';
import ApplicationStatusNotificationBridge from '@/src/infrastructure/notifications/ApplicationStatusNotificationBridge';
import { NotificationProvider } from '@/src/contexts/NotificationContext';
import { ReservationProvider } from '@/src/contexts/ReservationContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { FeedProvider } from '@/src/contexts/FeedContext';
import { VisitsProvider } from '@/src/contexts/VisitsContext';
import { ProfileProvider } from '@/src/contexts/ProfileContext';
import { PreloadProvider, usePreloadedVideo } from '@/src/contexts/PreloadContext';
import { usePreloadFirstVideo } from '@/src/features/listings/hooks';
import { RemainingPaymentHandler } from '@/src/features/payments/components/RemainingPaymentHandler';

export const unstable_settings = {
  anchor: '(tabs)',
};

const ICON_ASSETS = [
  require('../assets/icons/logo.png'),
  require('../assets/icons/home.png'),
  require('../assets/icons/profile.png'),
  require('../assets/icons/plus.png'),
  require('../assets/icons/favorites.png'),
  require('../assets/icons/visits.png'),
  require('../assets/icons/iconhote.png'),
  require('../assets/icons/iconlocataire.png'),
  require('../assets/icons/iconbailleur.png'),
  require('../assets/icons/feed-icon-like.png'),
  require('../assets/icons/feed-icon-comment.png'),
  require('../assets/icons/feed-icon-location.png'),
  require('../assets/icons/feed-icon-search.png'),
  require('../assets/icons/feed-icon-share.png'),
  require('../assets/icons/feed-icon-verified.png'),
  require('../assets/icons/splash1.png'),
  require('../assets/icons/splash2.png'),
  require('../assets/icons/splash3.png'),
  require('../assets/icons/splash4.png'),
];

function PreloadManager() {
  const localUri = usePreloadFirstVideo();
  const { setPreloadedVideoUri } = usePreloadedVideo();
  const hasPreventedRef = useRef(false);
  const hasHiddenRef = useRef(false);
  const [areIconAssetsReady, setAreIconAssetsReady] = useState(false);

  useEffect(() => {
    if (!hasPreventedRef.current) {
      hasPreventedRef.current = true;
      SplashScreen.preventAutoHideAsync().catch(() => null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    Asset.loadAsync(ICON_ASSETS)
      .catch((error) => {
        console.warn('[PreloadManager] Icon preload error', error);
      })
      .finally(() => {
        if (isMounted) {
          setAreIconAssetsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const hideSplashOnce = () => {
      if (hasHiddenRef.current) {
        return;
      }
      if (!areIconAssetsReady) {
        return;
      }
      hasHiddenRef.current = true;
      SplashScreen.hideAsync().catch(() => null);
    };

    if (localUri && areIconAssetsReady) {
      setPreloadedVideoUri(localUri);
      hideSplashOnce();
      return;
    }

    const timeout = setTimeout(() => {
      if (!hasHiddenRef.current && areIconAssetsReady) {
        hideSplashOnce();
      } else if (!hasHiddenRef.current) {
        // Fallback: ne bloquons pas indéfiniment le splash si les assets prennent trop de temps
        hasHiddenRef.current = true;
        SplashScreen.hideAsync().catch(() => null);
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [areIconAssetsReady, localUri, setPreloadedVideoUri]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    NativeStatusBar.setHidden(false, 'fade');
    return () => {
      NativeStatusBar.setHidden(false, 'fade');
    };
  }, []);

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
                    <StatusBar translucent backgroundColor="transparent" style="dark" />
                    <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
                    <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'none' }} />
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
                    <Stack.Screen name="host-visit/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="host-messages" options={{ headerShown: false }} />
                    <Stack.Screen name="host-reviews" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-likes" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-comments" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-visits" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-visit/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-tenants" options={{ headerShown: false }} />
                    <Stack.Screen name="landlord-tenant/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                    <Stack.Screen name="publish" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
                    <Stack.Screen name="profile/[profileId]" options={{ headerShown: false }} />
                    <Stack.Screen name="property/[id]" options={{ headerShown: false }} />
                    <Stack.Screen name="property/[id]/reviews" options={{ headerShown: false }} />
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
                    <Stack.Screen name="reviews/index" options={{ headerShown: false }} />
                    <Stack.Screen name="support/index" options={{ headerShown: false }} />
                    <Stack.Screen name="support/[id]" options={{ headerShown: false }} />
                    </Stack>
                    <VisitNotificationBridge />
                    <HostBookingNotificationBridge />
                    <HostCommentNotificationBridge />
                    <UserCommentNotificationBridge />
                    <HostReviewNotificationBridge />
                    <UserReviewReplyNotificationBridge />
                    <ApplicationStatusNotificationBridge />
                    <NotificationHost />
                    <RemainingPaymentHandler />
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
