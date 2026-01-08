import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  formatE164PhoneNumber,
  parseE164PhoneNumber,
  sanitizeNationalNumber,
} from '@/src/features/auth/phoneCountries';
import { supabase } from '@/src/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';
import type { SupabaseProfile } from '@/src/features/auth/hooks/AuthContext';
import {
  createSupabaseProfile,
  findSupabaseProfileByPhone,
} from '@/src/features/auth/phoneAuthService';
import { signInWithOtp, verifyOtp } from '@/src/features/auth/services/otpService';
import { HostVerificationModal } from '@/src/features/auth/components/HostVerificationModal';
import { LandlordSuccessScreen } from '@/src/features/auth/components/LandlordSuccessScreen';
import { STORAGE_KEYS } from '@/src/constants/storageKeys';

const PUOL_GREEN = '#2ECC71';
const PUOL_GREEN_LIGHT = 'rgba(46, 204, 113, 0.12)';

const propertyOptions = [
  { label: 'Appartements', iconName: 'building', IconComponent: FontAwesome5 },
  { label: 'Studios', iconName: 'layout', IconComponent: Feather },
  { label: 'Chambres', iconName: 'home', IconComponent: Feather },
  { label: 'Maisons', iconName: 'home', IconComponent: FontAwesome5 },
  { label: 'Boutiques commerciales', iconName: 'store', IconComponent: FontAwesome5 },
];

const inventoryOptions = ['1', '2 à 5', '5 et plus'];

type PropertyOption = (typeof propertyOptions)[number];

type PropertyChipProps = {
  option: PropertyOption;
  selected: boolean;
  onPress: () => void;
};

const PropertyChip: React.FC<PropertyChipProps> = ({ option, selected, onPress }) => {
  const IconComponent = option.IconComponent ?? Feather;
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <IconComponent
        name={option.iconName as any}
        size={16}
        color={selected ? '#FFFFFF' : PUOL_GREEN}
        style={styles.chipIcon}
      />
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{option.label}</Text>
    </TouchableOpacity>
  );
};

const WHATSAPP_SUPPORT_PHONE = '237699791732';
const WHATSAPP_SUPPORT_LINK = 'https://wa.me/237699791732';
const RESEND_COOLDOWN_SECONDS = 90;

type BlockInfo = {
  message: string;
  action?: 'profile' | 'home';
};

type ModalStep = 'verify' | 'success' | null;

export default function BecomeLandlordScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { supabaseProfile: user, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [verificationPhone, setVerificationPhone] = useState<string | null>(null);
  const resendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backNavigationInFlightRef = useRef(false);
  const pendingPhoneRef = useRef<string | null>(null);
  const pendingProfileRef = useRef<SupabaseProfile | null>(null);
  const prefillDoneRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  const justCompletedRef = useRef(false);
  const [hasLandlordCompletionFlag, setHasLandlordCompletionFlag] = useState(false);

  const isAuthenticated = Boolean(user);
  const hasPrefilledIdentity = Boolean(user?.first_name && user?.last_name && user?.phone);
  const normalizedPhone = formatE164PhoneNumber(phoneNumber, phoneCountry);
  const shouldLockIdentity = isAuthenticated && hasPrefilledIdentity;
  const phoneDisplay = normalizedPhone
    ? (() => {
        const { country, nationalNumber } = parseE164PhoneNumber(normalizedPhone);
        return `${country.dialCode} ${nationalNumber}`.trim();
      })()
    : `${phoneCountry.dialCode} ${phoneNumber}`.trim();

  const canSubmit =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    district.trim().length > 1 &&
    city.trim().length > 1 &&
    selectedTypes.length > 0 &&
    !!inventory &&
    !!normalizedPhone &&
    !isSendingCode &&
    !isSubmittingApplication &&
    !blockInfo;

  useEffect(() => {
    if (resendCooldown <= 0 && resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
      return;
    }

    if (resendCooldown > 0 && !resendIntervalRef.current) {
      resendIntervalRef.current = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }

    return () => {
      if (resendIntervalRef.current && resendCooldown <= 0) {
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
    };
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
    };
  }, []);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const illustrationScale = useRef(new Animated.Value(0.92)).current;
  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslateY = useRef(new Animated.Value(20)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(25)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(25)).current;
  const backOpacity = useRef(new Animated.Value(0)).current;
  const backTranslateY = useRef(new Animated.Value(20)).current;

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
      Animated.timing(bodyOpacity, { toValue: 1, duration: 600, delay: 250, useNativeDriver: true }),
      Animated.timing(bodyTranslateY, { toValue: 0, duration: 600, delay: 250, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(formOpacity, { toValue: 1, duration: 600, delay: 350, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 600, delay: 350, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(ctaOpacity, { toValue: 1, duration: 600, delay: 450, useNativeDriver: true }),
      Animated.timing(ctaTranslateY, { toValue: 0, duration: 600, delay: 450, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(backOpacity, { toValue: 1, duration: 600, delay: 550, useNativeDriver: true }),
      Animated.timing(backTranslateY, { toValue: 0, duration: 600, delay: 550, useNativeDriver: true }),
    ]).start();
  }, [backOpacity, backTranslateY, bodyOpacity, bodyTranslateY, ctaOpacity, ctaTranslateY, formOpacity, formTranslateY, headerOpacity, headerTranslateY, illustrationOpacity, illustrationScale]);

  const toggleType = useCallback((label: string) => {
    setSelectedTypes((prev) => (prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]));
  }, []);

  const startResendCountdown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }, []);

  const clearVerificationState = useCallback(() => {
    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
    pendingPhoneRef.current = null;
    pendingProfileRef.current = null;
    setVerificationPhone(null);
    setResendCooldown(0);
    setIsResendingCode(false);
  }, []);

  const evaluateBlockInfo = useCallback(
    (profile: SupabaseProfile | null, { treatAsCurrentUser = false }: { treatAsCurrentUser?: boolean } = {}): BlockInfo | null => {
      if (!profile) {
        return null;
      }

      const landlordStatus = profile.landlord_status ?? 'none';
      const role = profile.role ?? 'user';

      if (landlordStatus === 'approved' || role === 'landlord') {
        return {
          message: 'Tu es déjà bailleur sur PUOL. Accède à ton profil pour continuer.',
          action: 'profile',
        };
      }

      if (landlordStatus === 'pending') {
        if (treatAsCurrentUser) {
          return null;
        }

        return {
          message: 'Ta demande pour devenir bailleur est déjà en cours. Tu recevras une notification dès validation.',
          action: 'profile',
        };
      }

      if (!treatAsCurrentUser) {
        if (landlordStatus === 'rejected') {
          return {
            message:
              'Ce numéro est lié à un compte bailleur. Connecte-toi pour renvoyer une nouvelle demande avec les bonnes informations.',
            action: 'profile',
          };
        }

        return {
          message: "Ce numéro est déjà associé à un compte PUOL. Connecte-toi pour accéder à l’application.",
          action: 'profile',
        };
      }

      return null;
    },
    [],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    const info = evaluateBlockInfo(user, { treatAsCurrentUser: true });
    setBlockInfo(info);

    if (info) {
      return;
    }

    if (!prefillDoneRef.current) {
      if (user.first_name) {
        setFirstName(user.first_name || '');
      }
      if (user.last_name) {
        setLastName(user.last_name || '');
      }
      if (user.city) {
        setCity((prev) => prev || user.city || '');
      }
      if ((user as any).district) {
        setDistrict((prev) => prev || ((user as any).district as string) || '');
      }
      if (user.phone) {
        const { country, nationalNumber } = parseE164PhoneNumber(user.phone);
        setPhoneCountry(country);
        setPhoneNumber(nationalNumber);
      }
      prefillDoneRef.current = true;
    }
  }, [evaluateBlockInfo, user]);

  useEffect(() => {
    if (shouldLockIdentity && isCountryPickerOpen) {
      setIsCountryPickerOpen(false);
    }
  }, [isCountryPickerOpen, shouldLockIdentity]);

  useEffect(() => {
    if (!user || hasRedirectedRef.current || modalStep === 'success') {
      return;
    }

    const currentStatus = user.landlord_status ?? 'none';
    if (currentStatus === 'approved') {
      hasRedirectedRef.current = true;
      router.replace('/(tabs)' as never);
    }
  }, [modalStep, router, user]);

  useEffect(() => {
    let mounted = true;
    const checkCompletionFlag = async () => {
      try {
        const flag = await AsyncStorage.getItem(STORAGE_KEYS.LANDLORD_APPLICATION_COMPLETED);
        if (!mounted) return;
        const completed = flag === 'true';
        setHasLandlordCompletionFlag(completed);
        if (completed && !hasRedirectedRef.current && modalStep !== 'success' && !justCompletedRef.current) {
          hasRedirectedRef.current = true;
          router.replace('/(tabs)' as never);
        }
      } catch (error) {
        console.warn('[BecomeLandlord] read LANDLORD_APPLICATION_COMPLETED failed', error);
      }
    };
    checkCompletionFlag();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleBlockAction = useCallback(() => {
    if (!blockInfo?.action) {
      return;
    }

    if (blockInfo.action === 'profile') {
      router.replace('/(tabs)' as never);
    } else if (blockInfo.action === 'home') {
      router.replace('/' as never);
    }
  }, [blockInfo, router]);

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

  const ensureLandlordApplication = useCallback(async (profileId: string) => {
    const { data: existingApplication, error: fetchError } = await supabase
      .from('landlord_applications')
      .select('id, status, reviewed_at')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingApplication) {
      const needsUpdate = existingApplication.status !== 'approved' || existingApplication.reviewed_at === null;

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('landlord_applications')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', existingApplication.id);

        if (updateError) {
          throw updateError;
        }
      }

      return;
    }

    const { error: insertError } = await supabase
      .from('landlord_applications')
      .insert({ profile_id: profileId, status: 'approved', reviewed_at: new Date().toISOString() });

    if (insertError) {
      throw insertError;
    }
  }, []);

  const markLandlordCompletion = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANDLORD_APPLICATION_COMPLETED, 'true');
      setHasLandlordCompletionFlag(true);
    } catch (error) {
      console.warn('[BecomeLandlord] persist completion flag failed', error);
    }
  }, []);

  const submitLandlordApplication = useCallback(
    async (profileId: string, normalizedPhoneNumber: string) => {
      await ensureLandlordApplication(profileId);

      const updates = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        city: city.trim() || null,
        phone: normalizedPhoneNumber,
        role: 'landlord',
        landlord_status: 'pending',
        supply_role: 'landlord',
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', profileId);
      if (profileError) {
        throw profileError;
      }

      await refreshProfile().catch((err) => console.warn('[BecomeLandlord] refreshProfile warning', err));
      await markLandlordCompletion();

      const messageLines = [
        'Nouvelle demande bailleur PUOL',
        '',
        `Nom: ${firstName.trim()} ${lastName.trim()}`.trim(),
        `Téléphone: ${normalizedPhoneNumber}`,
        `Quartier: ${district.trim() || 'Non précisé'}`,
        `Ville: ${city.trim() || 'Non précisée'}`,
        `Types de biens: ${selectedTypes.length ? selectedTypes.join(', ') : 'Non précisés'}`,
        `Nombre de biens: ${inventory ?? 'Non précisé'}`,
      ];

      const encodedMessage = encodeURIComponent(messageLines.join('\n'));
      const whatsappDeepLink = `whatsapp://send?phone=${WHATSAPP_SUPPORT_PHONE}&text=${encodedMessage}`;
      const whatsappApiLink = `https://api.whatsapp.com/send?phone=${WHATSAPP_SUPPORT_PHONE}&text=${encodedMessage}`;

      try {
        await Linking.openURL(whatsappDeepLink);
      } catch (deepLinkError) {
        console.warn('[BecomeLandlord] WhatsApp deep link error', deepLinkError);
        try {
          await Linking.openURL(whatsappApiLink);
        } catch (apiLinkError) {
          console.warn('[BecomeLandlord] WhatsApp API link error', apiLinkError);
          try {
            await Linking.openURL(WHATSAPP_SUPPORT_LINK);
          } catch (fallbackError) {
            console.error('[BecomeLandlord] WhatsApp open error', fallbackError);
          }
        }
      }
    },
    [city, district, ensureLandlordApplication, firstName, inventory, lastName, refreshProfile, selectedTypes],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    const e164Phone = normalizedPhone;
    if (!e164Phone) {
      setVerificationError('Numéro de téléphone invalide.');
      return;
    }

    if (shouldLockIdentity && user?.id) {
      const alreadyCompleted = hasLandlordCompletionFlag;
      setIsSubmittingApplication(true);
      setVerificationError(null);

      try {
        await submitLandlordApplication(user.id, e164Phone);
        setBlockInfo(null);
        clearVerificationState();
        if (alreadyCompleted) {
          hasRedirectedRef.current = true;
          router.replace('/(tabs)' as never);
        } else {
          justCompletedRef.current = true;
          setModalStep('success');
        }
      } catch (error) {
        console.error('[BecomeLandlord] direct submit error', error);
        setVerificationError("Impossible d'envoyer la demande. Réessaie ou contacte le support.");
      } finally {
        setIsSubmittingApplication(false);
      }

      return;
    }

    setIsSendingCode(true);
    setVerificationError(null);

    try {
      const profileByPhone = await findSupabaseProfileByPhone(e164Phone);
      const isCurrentUser = Boolean(user && profileByPhone && profileByPhone.id === user.id);
      const blockingInfo = evaluateBlockInfo(profileByPhone, { treatAsCurrentUser: isCurrentUser });

      if (blockingInfo) {
        setBlockInfo(blockingInfo);
        setIsSendingCode(false);
        return;
      }

      console.log('[BecomeLandlord] Sending OTP via Supabase to:', e164Phone);
      await signInWithOtp({ phone: e164Phone });

      pendingPhoneRef.current = e164Phone;
      pendingProfileRef.current = profileByPhone ?? user ?? null;
      setVerificationPhone(e164Phone);
      startResendCountdown();
      setModalStep('verify');
    } catch (error) {
      console.error('[BecomeLandlord] OTP send error', error);
      setVerificationError("Impossible d'envoyer le code. Vérifie ton numéro et réessaie.");
    } finally {
      setIsSendingCode(false);
    }
  }, [
    canSubmit,
    clearVerificationState,
    clearVerificationState,
    hasLandlordCompletionFlag,
    normalizedPhone,
    router,
    shouldLockIdentity,
    startResendCountdown,
    submitLandlordApplication,
    user,
  ]);

  const handleVerify = useCallback(
    async (code: string, phoneNumber: string) => {
      if (!code || !phoneNumber) {
        return;
      }

      setIsSubmitting(true);
      setVerificationError(null);

      try {
        console.log('[BecomeLandlord] Verifying OTP code via Supabase', { phone: phoneNumber });
        const verifyResult = await verifyOtp({
          phone: phoneNumber,
          token: code,
        });

        if (!verifyResult.success) {
          throw new Error('OTP verification failed');
        }

        const normalizedPhone = phoneNumber;

        // Chercher si un profil existe déjà avec ce numéro de téléphone
        console.log('[BecomeLandlord] Checking if profile exists...');
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', normalizedPhone);
        
        console.log('[BecomeLandlord] All profiles with this phone:', {
          count: allProfiles?.length,
          profiles: allProfiles?.map(p => ({ id: p.id, phone: p.phone }))
        });

        let targetProfile = allProfiles?.[0];

        if (!targetProfile) {
          console.log('[BecomeLandlord] No profile found - creating with phone as ID');
          // Créer le profil manuellement avec le numéro de téléphone comme ID
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: normalizedPhone,
              phone: normalizedPhone,
              first_name: firstName,
              last_name: lastName,
              role: 'guest',
              supply_role: 'landlord',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('*')
            .single();

          if (createError) {
            console.error('[BecomeLandlord] Error creating profile:', createError);
            throw createError;
          }

          console.log('[BecomeLandlord] Profile created successfully with ID:', createdProfile?.id);
          targetProfile = createdProfile;
        } else {
          console.log('[BecomeLandlord] Profile exists - updating with form info, ID:', targetProfile.id);
          // Mettre à jour le profil existant avec les informations du formulaire
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: firstName,
              last_name: lastName,
              supply_role: 'landlord',
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetProfile.id);

          if (updateError) {
            console.error('[BecomeLandlord] Error updating profile:', updateError);
            throw updateError;
          }
          console.log('[BecomeLandlord] Profile updated successfully');
        }

        console.log('[BecomeLandlord] Profile ready:', targetProfile.id);
        const profileId = targetProfile.id;

        const alreadyCompleted = hasLandlordCompletionFlag;
        await submitLandlordApplication(profileId, normalizedPhone);

        setBlockInfo(null);
        clearVerificationState();
        if (alreadyCompleted) {
          hasRedirectedRef.current = true;
          router.replace('/(tabs)' as never);
        } else {
          justCompletedRef.current = true;
          setModalStep('success');
        }
      } catch (error) {
        console.error('[BecomeLandlord] OTP verification error', error);
        const errorCode = (error as { code?: string })?.code;
        const fallbackMessage =
          'Une erreur est survenue pendant la vérification. Réessaie ou contacte le support.';
        const otpMessage = 'Code invalide ou expiré. Réessaie.';

        if (typeof errorCode === 'string' && errorCode.startsWith('auth/')) {
          setVerificationError(otpMessage);
        } else {
          setVerificationError(fallbackMessage);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearVerificationState, hasLandlordCompletionFlag, router, submitLandlordApplication, user],
  );

  const handleResendCode = useCallback(async () => {
    if (!verificationPhone) {
      return;
    }

    setIsResendingCode(true);
    setVerificationError(null);

    try {
      console.log('[BecomeLandlord] Resending OTP via Supabase to:', verificationPhone);
      await signInWithOtp({ phone: verificationPhone });
      startResendCountdown();
    } catch (error) {
      console.error('[BecomeLandlord] OTP resend error', error);
      setVerificationError('Impossible de renvoyer le code pour le moment. Réessaie plus tard.');
    } finally {
      setIsResendingCode(false);
    }
  }, [startResendCountdown, verificationPhone]);

  const handleCloseModal = useCallback(() => {
    setModalStep(null);
    setVerificationError(null);
    clearVerificationState();
  }, [clearVerificationState]);

  const handleCloseSuccess = useCallback(() => {
    clearVerificationState();
    justCompletedRef.current = false;
    setModalStep(null);
  }, [clearVerificationState]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        handleBack();
        return true;
      };

      const hardwareSubscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      const removeBeforeRemove = navigation.addListener('beforeRemove', (event: any) => {
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
        hardwareSubscription.remove();
        removeBeforeRemove();
        backNavigationInFlightRef.current = false;
      };
    }, [handleBack, navigation]),
  );

  const renderInventoryOption = useCallback(
    (label: string) => {
      const selected = inventory === label;
      return (
        <TouchableOpacity
          key={label}
          style={[styles.inventoryOption, selected && styles.inventoryOptionSelected]}
          onPress={() => setInventory(label)}
          activeOpacity={0.85}
        >
          <Text style={[styles.inventoryLabel, selected && styles.inventoryLabelSelected]}>{label}</Text>
        </TouchableOpacity>
      );
    },
    [inventory],
  );

  const renderForm = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[0]}
    >
      <View style={[styles.stickyHeaderContainer, { paddingTop: insets.top + 8 }]}>
        <Animated.View style={[styles.backButtonContainer, { opacity: backOpacity, transform: [{ translateY: backTranslateY }] }]}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}
      >
        <Text style={styles.kicker}>Trouver un locataire n'a jamais été aussi facile</Text>
      </Animated.View>

      <Animated.Image
        source={require('../assets/icons/splash2.png')}
        style={[styles.hero, { opacity: illustrationOpacity, transform: [{ scale: illustrationScale }] }]}
        resizeMode="contain"
      />

      <Animated.View style={[styles.bodyTextContainer, { opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] }]}
      >
        <Text style={styles.title}>Deviens bailleur sur PUOL</Text>
        <Text style={styles.subtitle}>Dis-nous un peu plus pour t'aider à publier ton bien.</Text>
      </Animated.View>

      <Animated.View style={[styles.formCard, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}
      >
        {shouldLockIdentity ? (
          <View style={styles.identitySummary}>
            <Text style={styles.identitySummaryTitle}>Tes informations d'identité</Text>
            <View style={styles.identitySummaryRow}>
              <Text style={styles.identitySummaryLabel}>Nom complet</Text>
              <Text style={styles.identitySummaryValue}>{`${firstName} ${lastName}`.trim()}</Text>
            </View>
            <View style={styles.identitySummaryRow}>
              <Text style={styles.identitySummaryLabel}>Téléphone</Text>
              <Text style={styles.identitySummaryValue}>{phoneDisplay}</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.fieldLabel}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Alex"
                  placeholderTextColor="#9CA3AF"
                  value={firstName}
                  onChangeText={setFirstName}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.nameField}>
                <Text style={styles.fieldLabel}>Nom</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Landjou"
                  placeholderTextColor="#9CA3AF"
                  value={lastName}
                  onChangeText={setLastName}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Numéro WhatsApp</Text>
              <View style={styles.phoneField}>
                <TouchableOpacity
                  style={styles.countrySelector}
                  activeOpacity={0.8}
                  onPress={() => setIsCountryPickerOpen((prev) => !prev)}
                >
                  <Text style={styles.flag}>{phoneCountry.flag}</Text>
                  <Text style={styles.prefix}>{phoneCountry.dialCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  placeholder={phoneCountry.inputPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(value) => setPhoneNumber(sanitizeNationalNumber(value, phoneCountry))}
                />
              </View>
            </View>
            {isCountryPickerOpen && (
              <View style={styles.countryList}>
                {PHONE_COUNTRY_OPTIONS.map((country) => (
                  <TouchableOpacity
                    key={country.code}
                    style={[styles.countryItem, country.code === phoneCountry.code && styles.countryItemActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setPhoneCountry(country);
                      setPhoneNumber('');
                      setIsCountryPickerOpen(false);
                    }}
                  >
                    <Text style={styles.flag}>{country.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.countryName}>{country.name}</Text>
                      <Text style={styles.countryDial}>{country.dialCode}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Quartier</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Bonapriso"
            placeholderTextColor="#9CA3AF"
            value={district}
            onChangeText={setDistrict}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ville</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Douala"
            placeholderTextColor="#9CA3AF"
            value={city}
            onChangeText={setCity}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quel type de biens proposes-tu ?</Text>
        </View>
        <View style={styles.chipsContainer}>
          {propertyOptions.map((option) => (
            <PropertyChip
              key={option.label}
              option={option}
              selected={selectedTypes.includes(option.label)}
              onPress={() => toggleType(option.label)}
            />
          ))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 20 }]}
        >
          <Text style={styles.sectionTitle}>Nombre de biens</Text>
        </View>
        <View style={styles.inventoryRow}>{inventoryOptions.map(renderInventoryOption)}</View>
      </Animated.View>

      <Animated.View style={[styles.ctaContainer, { opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }] }]}
      >
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={[styles.submitLabel, !canSubmit && styles.submitLabelDisabled]}>Envoyer</Text>
        </TouchableOpacity>
      </Animated.View>

      {verificationError ? <Text style={styles.errorBanner}>{verificationError}</Text> : null}
    </ScrollView>
  );

  const shouldShowBlockScreen = Boolean(blockInfo && modalStep === null && !user);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {shouldShowBlockScreen && blockInfo ? (
          <View style={styles.blockContainer}>
            <Text style={styles.blockTitle}>Accès à ton tableau de bord</Text>
            <Text style={styles.blockMessage}>{blockInfo.message}</Text>
            {blockInfo.action ? (
              <TouchableOpacity style={styles.blockButton} onPress={handleBlockAction} activeOpacity={0.85}>
                <Text style={styles.blockButtonText}>Ouvrir mon tableau de bord</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          renderForm()
        )}
      </KeyboardAvoidingView>

      {isSendingCode ? (
        <View style={styles.loadingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={PUOL_GREEN} />
          <Text style={styles.loadingText}>Envoi du code de vérification…</Text>
        </View>
      ) : null}

      <HostVerificationModal
        isVisible={modalStep === 'verify'}
        onClose={handleCloseModal}
        onVerify={handleVerify}
        isVerifying={isSubmitting}
        phoneNumber={verificationPhone ?? formatE164PhoneNumber(phoneNumber, phoneCountry) ?? ''}
        errorMessage={verificationError}
        onResend={handleResendCode}
        isResending={isResendingCode}
        resendCooldown={resendCooldown}
      />

      <Modal visible={modalStep === 'success'} animationType="slide">
        <LandlordSuccessScreen onClose={handleCloseSuccess} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 70,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  stickyHeaderContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButtonContainer: {
    alignSelf: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 20,
    color: '#4B5563',
  },
  header: {
    marginBottom: 20,
  },
  kicker: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: PUOL_GREEN,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  hero: {
    width: '100%',
    height: 220,
    marginBottom: 20,
  },
  bodyTextContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#475467',
    lineHeight: 20,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    gap: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameField: {
    flex: 1,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  flag: {
    fontSize: 18,
  },
  prefix: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#0F172A',
  },
  phoneInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  countryList: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryItemActive: {
    backgroundColor: PUOL_GREEN_LIGHT,
  },
  countryName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  countryDial: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  identitySummary: {
    backgroundColor: PUOL_GREEN_LIGHT,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  identitySummaryTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  identitySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  identitySummaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#475467',
  },
  identitySummaryValue: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: PUOL_GREEN,
    borderColor: PUOL_GREEN,
  },
  chipIcon: {
    marginRight: 2,
  },
  chipLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  inventoryOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  inventoryOptionSelected: {
    backgroundColor: PUOL_GREEN_LIGHT,
    borderColor: PUOL_GREEN,
  },
  inventoryLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inventoryLabelSelected: {
    color: '#0F6848',
  },
  ctaContainer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: PUOL_GREEN,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: PUOL_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(46, 204, 113, 0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitLabel: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitLabelDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  blockContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  blockTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  blockMessage: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: '#475467',
    textAlign: 'center',
    lineHeight: 22,
  },
  blockButton: {
    marginTop: 8,
    backgroundColor: PUOL_GREEN,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  blockButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
});
