import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
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
import { useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';

const { width } = Dimensions.get('window');

type PropertyOption = {
  value: string;
  label: string;
  iconName: string;
  IconComponent?: typeof Feather;
};

export default function SearchPropertyScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const backNavigationInFlightRef = useRef(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.RENTAL_PREFERENCES);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          return;
        }
        setSelectedTypes(parsed.filter((value): value is string => typeof value === 'string'));
      } catch (error) {
        console.warn('[SearchPropertyScreen] Failed to load preferences', error);
      }
    };

    loadPreferences();
  }, []);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationScale = useRef(new Animated.Value(0.95)).current;
  const introOpacity = useRef(new Animated.Value(0)).current;
  const introTranslateY = useRef(new Animated.Value(20)).current;
  const questionOpacity = useRef(new Animated.Value(0)).current;
  const questionTranslateY = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(20)).current;
  const backOpacity = useRef(new Animated.Value(0)).current;
  const backTranslateY = useRef(new Animated.Value(20)).current;

  const propertyOptions: PropertyOption[] = useMemo(
    () => [
      { value: 'meuble', label: 'Meublé', iconName: 'building', IconComponent: FontAwesome5 },
      { value: 'non-meuble', label: 'Non-meublé', iconName: 'home', IconComponent: Feather },
      { value: 'boutique', label: 'Boutique / Espace commercial', iconName: 'store', IconComponent: FontAwesome5 },
    ],
    [],
  );

  const toggleSelection = (value: string) => {
    setSelectedTypes((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      return;
    }
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.RENTAL_PREFERENCES, JSON.stringify(selectedTypes)],
      [STORAGE_KEYS.RENTAL_PREFERENCES_COMPLETED, 'true'],
    ]);
    router.replace('/(tabs)' as never);
  };

  const handleBack = useCallback(() => {
    if (backNavigationInFlightRef.current) {
      return;
    }

    backNavigationInFlightRef.current = true;

    if (navigation.canGoBack?.()) {
      navigation.goBack();
    } else {
      router.replace('/onboarding' as never);
    }
  }, [navigation, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(illustrationOpacity, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.timing(illustrationScale, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(introOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
      Animated.timing(introTranslateY, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(questionOpacity, { toValue: 1, duration: 600, delay: 300, useNativeDriver: true }),
      Animated.timing(questionTranslateY, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(ctaOpacity, { toValue: 1, duration: 600, delay: 400, useNativeDriver: true }),
      Animated.timing(ctaTranslateY, { toValue: 0, duration: 600, delay: 400, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(backOpacity, { toValue: 1, duration: 600, delay: 500, useNativeDriver: true }),
      Animated.timing(backTranslateY, { toValue: 0, duration: 600, delay: 500, useNativeDriver: true }),
    ]).start();
  }, [backOpacity, backTranslateY, ctaOpacity, ctaTranslateY, headerOpacity, headerTranslateY, illustrationOpacity, illustrationScale, introOpacity, introTranslateY, questionOpacity, questionTranslateY]);

  useFocusEffect(
    useCallback(() => {
      const handleBackAction = () => {
        handleBack();
        return true;
      };

      const hardwareSub = BackHandler.addEventListener('hardwareBackPress', handleBackAction);
      const removeBeforeRemove = navigation.addListener('beforeRemove', (event) => {
        if (event.data.action.type !== 'POP') {
          return;
        }

        if (navigation.canGoBack?.()) {
          return;
        }

        event.preventDefault();
        handleBack();
      });

      return () => {
        hardwareSub.remove();
        removeBeforeRemove();
        backNavigationInFlightRef.current = false;
      };
    }, [handleBack, navigation]),
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <Animated.View
          style={[
            styles.stickyHeaderContainer,
            {
              paddingTop: insets.top + 12,
              opacity: backOpacity,
              transform: [{ translateY: backTranslateY }],
            },
          ]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}>
          <Text style={styles.logo}>PUOL</Text>
          <Text style={styles.sublogo}>Platform for Urban Online Living</Text>
        </Animated.View>

        <View style={styles.mainContent}>
          <Animated.View
            style={[
              styles.illustrationContainer,
              {
                opacity: illustrationOpacity,
                transform: [{ scale: illustrationScale }],
              },
            ]}
          >
            <Image source={require('../assets/icons/splash4.png')} style={styles.illustration} resizeMode="contain" />
          </Animated.View>

          <Animated.View
            style={[
              styles.introContainer,
              {
                opacity: introOpacity,
                transform: [{ translateY: introTranslateY }],
              },
            ]}
          >
            <Text style={styles.introTitle}>Bienvenue sur notre plateforme en ligne dédiée au logement urbain.</Text>
            <Text style={styles.introDescription}>
              Nous sommes là pour vous aider à trouver votre prochain logement, qu'il soit meublé, non-meublé, boutique ou espace commercial.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.questionContainer,
              { opacity: questionOpacity, transform: [{ translateY: questionTranslateY }] },
            ]}
          >
            <Text style={styles.questionTitle}>Vous cherchez quoi exactement ?</Text>
            <View style={styles.pillsContainer}>
              {propertyOptions.map((option) => (
                <OptionPill
                  key={option.value}
                  option={option}
                  isSelected={selectedTypes.includes(option.value)}
                  onPress={() => toggleSelection(option.value)}
                />
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.ctaContainer, { opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }] }]}>
            <Text style={styles.ctaText}>Prêt à trouver votre prochain logement ?</Text>
            <TouchableOpacity
              style={[styles.submitButton, selectedTypes.length === 0 && styles.submitButtonDisabled]}
              disabled={selectedTypes.length === 0}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={[styles.submitButtonText, selectedTypes.length === 0 && styles.submitButtonTextDisabled]}>
                Trouver ma Puol
              </Text>
              <Text style={[styles.submitButtonArrow, selectedTypes.length === 0 && styles.submitButtonTextDisabled]}>→</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

    </View>
  );
}

type OptionPillProps = {
  option: PropertyOption;
  isSelected: boolean;
  onPress: () => void;
};

const OptionPill: React.FC<OptionPillProps> = ({ option, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const IconComponent = option.IconComponent ?? Feather;

  useEffect(() => {
    if (isSelected) {
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true }).start();
    } else {
      Animated.timing(checkScale, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [checkScale, isSelected]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.pill, isSelected && styles.pillSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <IconComponent
          name={option.iconName as any}
          size={18}
          color={isSelected ? '#FFFFFF' : '#2ECC71'}
          style={styles.pillIcon}
        />
        <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>{option.label}</Text>
        {isSelected && (
          <Animated.Text style={[styles.checkmark, { transform: [{ scale: checkScale }] }]}>✓</Animated.Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 32,
  },
  stickyHeaderContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: 'center',
  },
  logo: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
    letterSpacing: 0.5,
  },
  sublogo: {
    fontFamily: 'Manrope',
    fontSize: 10,
    color: '#999999',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: 224,
    height: 224,
  },
  introContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  introDescription: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6A6A6A',
    lineHeight: 18,
    textAlign: 'center',
  },
  questionContainer: {
    marginBottom: 20,
    width: '100%',
  },
  questionTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillSelected: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  pillIcon: {
    marginRight: 4,
  },
  pillLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  pillLabelSelected: {
    color: '#FFFFFF',
  },
  checkmark: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  submitButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#2ECC71',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
  submitButtonArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
});
