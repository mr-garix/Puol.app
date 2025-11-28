import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';

const PRIMARY = '#2ECC71';
const { height } = Dimensions.get('window');

type Option = {
  id: 'renter' | 'host' | 'landlord';
  title: string;
  description: string;
  icon: any;
  iconBg: string;
};

export default function OnboardingScreen() {
  const router = useRouter();

  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(-10)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationTranslateY = useRef(new Animated.Value(-20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(welcomeTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(illustrationOpacity, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(illustrationTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(footerOpacity, {
      toValue: 1,
      duration: 600,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, [footerOpacity, illustrationOpacity, illustrationTranslateY, titleOpacity, titleTranslateY, welcomeOpacity, welcomeTranslateY]);

  const handleSelect = useCallback(
    async (role: 'renter' | 'host' | 'landlord') => {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.USER_ROLE, role],
        [STORAGE_KEYS.ONBOARDING_COMPLETED, 'true'],
      ]);

      if (role === 'renter') {
        router.replace('/search' as never);
        return;
      }

      if (role === 'host') {
        await AsyncStorage.multiSet([[STORAGE_KEYS.HOST_APPLICATION_COMPLETED, 'false']]);
        await AsyncStorage.removeItem(STORAGE_KEYS.HOST_PROFILE);
        router.replace('/host' as never);
        return;
      }

      if (role === 'landlord') {
        await AsyncStorage.multiSet([[STORAGE_KEYS.LANDLORD_APPLICATION_COMPLETED, 'false']]);
        await AsyncStorage.removeItem(STORAGE_KEYS.LANDLORD_PROFILE);
        router.replace('/landlord' as never);
        return;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.RENTAL_PREFERENCES_COMPLETED, 'true');
      router.replace('/(tabs)' as never);
    },
    [router],
  );

  const options = useMemo<Option[]>(
    () => [
      {
        id: 'renter',
        title: 'Je cherche un logement',
        description:
          'Découvrir des appartements, studios, maisons, boutiques ou chambres à louer (meublés ou non meublés).',
        icon: require('../assets/icons/iconlocataire.png'),
        iconBg: '#2ECC71',
      },
      {
        id: 'host',
        title: 'Je suis hôte',
        description: 'Je loue des appartements, studios, chambres ou maisons meublés à la nuit.',
        icon: require('../assets/icons/iconhote.png'),
        iconBg: '#FF6B35',
      },
      {
        id: 'landlord',
        title: 'Je suis bailleur',
        description: 'Je loue des maisons, appartements, studios, chambres ou boutiques non meublés à louer.',
        icon: require('../assets/icons/iconbailleur.png'),
        iconBg: '#4A90E2',
      },
    ],
    [],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />

      <Animated.View
        style={[
          styles.welcomeContainer,
          {
            opacity: welcomeOpacity,
            transform: [{ translateY: welcomeTranslateY }],
          },
        ]}
      >
        <Text style={styles.welcomeText}>BIENVENUE</Text>
        <Text style={styles.welcomeSubtext}>Platform for Urban Online Living</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.illustrationContainer,
          {
            opacity: illustrationOpacity,
            transform: [{ translateY: illustrationTranslateY }],
          },
        ]}
      >
        <Image source={require('../assets/icons/splash1.png')} style={styles.illustration} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>Que veux-tu faire sur PUOL ?</Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <OptionCard key={option.id} option={option} index={index} onSelect={() => handleSelect(option.id)} />
        ))}
      </View>

      <Animated.View style={[styles.footerContainer, { opacity: footerOpacity }]}>
        <Text style={styles.footerText}>
          {`Tu pourras toujours changer ton choix plus tard\ndans les paramètres de ton profil.`}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

type OptionCardProps = {
  option: Option;
  index: number;
  onSelect: () => void;
};

const OptionCard: React.FC<OptionCardProps> = ({ option, index, onSelect }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: 300 + index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, index, translateY]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }, { scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.9}
        onPress={() => {
          handlePressOut();
          onSelect();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${option.iconBg}26` }]}>
          <Image source={option.icon} style={styles.optionIcon} resizeMode="contain" />
        </View>

        <View style={styles.textContent}>
          <Text style={styles.optionTitle}>{option.title}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>

        <Text style={styles.chevronIcon}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingTop: 70,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 24,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  welcomeText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    color: PRIMARY,
  },
  welcomeSubtext: {
    fontFamily: 'Manrope',
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: '#999999',
    marginTop: 4,
  },
  illustrationContainer: {
    height: height * 0.26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '80%',
    height: '100%',
    transform: [{ scale: 1.15 }, { translateY: -20 }],
  },
  titleContainer: {
    marginTop: -16,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIcon: {
    width: 32,
    height: 32,
  },
  textContent: {
    flex: 1,
    paddingRight: 4,
  },
  optionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionDescription: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#666666',
    lineHeight: 17,
  },
  chevronIcon: {
    fontSize: 28,
    color: '#9CA3AF',
    fontWeight: '300',
    marginLeft: 8,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  comingSoonText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '500',
    color: '#666666',
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: -10,
  },
  footerText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#999999',
    lineHeight: 18,
    textAlign: 'center',
  },
});
