import React, { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SplashScreen } from '@/src/components/ui/SplashScreen';
import { STORAGE_KEYS } from '@/src/constants/storageKeys';

export default function IntroScreen() {
  const router = useRouter();
  const hasNavigatedRef = useRef(false);

  const handleFinish = useCallback(async () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    try {
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      const hasDoneOnboarding = onboardingCompleted === 'true';

      if (!hasDoneOnboarding) {
        router.replace('/onboarding');
        return;
      }

      // Rediriger vers le feed directement
      // Les utilisateurs peuvent accéder aux formulaires Host/Landlord manuellement depuis l'app
      router.replace('/(tabs)');
    } catch (error) {
      console.warn('[IntroScreen] Error during navigation check:', error);
      // En cas d'erreur de lecture, on continue vers les tabs pour ne pas bloquer l'utilisateur
      router.replace('/(tabs)');
    }
  }, [router]);

  return <SplashScreen onFinish={handleFinish} />;
}
