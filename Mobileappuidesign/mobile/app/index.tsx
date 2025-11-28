import React, { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SplashScreen } from '@/components/SplashScreen';
import { STORAGE_KEYS } from '@/src/constants/storageKeys';

export default function IntroScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const handleFinish = useCallback(async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    try {
      const [onboardingCompleted, role, preferencesCompleted, hostCompleted, landlordCompleted] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        STORAGE_KEYS.USER_ROLE,
        STORAGE_KEYS.RENTAL_PREFERENCES_COMPLETED,
        STORAGE_KEYS.HOST_APPLICATION_COMPLETED,
        STORAGE_KEYS.LANDLORD_APPLICATION_COMPLETED,
      ]);

      const hasDoneOnboarding = onboardingCompleted[1] === 'true';
      const userRole = role[1];
      const hasPreferences = preferencesCompleted[1] === 'true';
      const hasHostApplication = hostCompleted[1] === 'true';
      const hasLandlordApplication = landlordCompleted[1] === 'true';

      if (!hasDoneOnboarding) {
        router.replace('/onboarding');
        return;
      }

      if (userRole === 'renter' && !hasPreferences) {
        router.replace('/search');
        return;
      }

      if (userRole === 'host' && !hasHostApplication) {
        router.replace('/host');
        return;
      }

      if (userRole === 'landlord' && !hasLandlordApplication) {
        router.replace('/landlord');
        return;
      }

      router.replace('/(tabs)');
    } catch (error) {
      // En cas d’erreur de lecture, on continue vers les tabs pour ne pas bloquer l’utilisateur
      router.replace('/(tabs)');
    }
  }, [router]);

  return <SplashScreen onFinish={handleFinish} />;
}
