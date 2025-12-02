import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, FontAwesome5 } from '@expo/vector-icons';

import {
  HostOnboardingForm,
  HostVerificationModal,
  HostSuccessScreen,
  type HostOnboardingData,
} from '@/src/features/auth/components';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  formatE164PhoneNumber,
  sanitizeNationalNumber,
} from '@/src/features/auth/phoneCountries';
import { supabase } from '@/src/supabaseClient';
import { useAuth } from '@/src/contexts/AuthContext';

const PUOL_GREEN = '#2ECC71';
const PUOL_GREEN_LIGHT = 'rgba(46, 204, 113, 0.12)';

const furnitureOptions = [
  { label: 'Chambre meublée', iconName: 'bed', IconComponent: FontAwesome5 },
  { label: 'Studio meublé', iconName: 'layout', IconComponent: Feather },
  { label: 'Appartement meublé', iconName: 'building', IconComponent: FontAwesome5 },
  { label: 'Maison meublée', iconName: 'home', IconComponent: FontAwesome5 },
];

const inventoryOptions = ['1', '2 à 5', '5 et plus'];

type FurnitureOption = (typeof furnitureOptions)[number];

type FurnitureChipProps = {
  option: FurnitureOption;
  selected: boolean;
  onPress: () => void;
};

const FurnitureChip: React.FC<FurnitureChipProps> = ({ option, selected, onPress }) => {
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

type ModalStep = 'verify' | 'success' | null;

export default function BecomeHostScreen() {
  const router = useRouter();
  const { supabaseProfile: user } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [city, setCity] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    city.trim().length > 2 &&
    selectedTypes.length > 0 &&
    !!inventory &&
    phoneNumber.trim().length === phoneCountry.minLength;

  // Animations
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    
    const e164Phone = formatE164PhoneNumber(phoneNumber, phoneCountry);
    const onboardingData: HostOnboardingData = {
      firstName,
      lastName,
      phoneCountry,
      phoneNumber: e164Phone,
      city,
      selectedTypes,
      inventory,
    };

    try {
      console.log('[BecomeHost] Envoi du code SMS vers', e164Phone);
      // TODO: intégrer ton service d'envoi SMS ici
      setModalStep('verify');
    } catch (error) {
      console.error('[BecomeHost] Erreur lors de la soumission', error);
    }
  };

  const handleVerify = async (code: string) => {
    setIsSubmitting(true);
    try {
      console.log('[BecomeHost] Vérification du code', code);
      // TODO: intégrer ton service de vérification SMS ici

      // Enregistrer les données dans Supabase
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: formatE164PhoneNumber(phoneNumber, phoneCountry),
            city: city,
            role: 'host',
            host_status: 'pending',
            business_name: `${firstName} ${lastName}`,
            furnished_types: selectedTypes,
            inventory: inventory,
            inventory_count: inventory === '1' ? 1 : inventory === '2 à 5' ? 3 : 6,
            stats: { views: 0, likes: 0, comments: 0 },
          })
          .eq('id', user.id);

        if (error) {
          console.error('[BecomeHost] Erreur Supabase', error);
          throw error;
        }
      }

      setModalStep('success');
    } catch (error) {
      console.error('[BecomeHost] Erreur lors de la vérification', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setModalStep(null);
    setVerificationCode('');
  };

  const handleCloseSuccess = () => {
    handleCloseModal();
    router.back();
  };

  const handleBack = () => {
    router.replace('/onboarding' as never);
  };

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.backButtonContainer, { opacity: backOpacity, transform: [{ translateY: backTranslateY }] }]}> 
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }]}> 
            <Text style={styles.kicker}>Louer n'a jamais été aussi simple</Text>
          </Animated.View>

          <Animated.Image
            source={require('../assets/icons/splash3.png')}
            style={[styles.hero, { opacity: illustrationOpacity, transform: [{ scale: illustrationScale }] }]}
            resizeMode="contain"
          />

          <Animated.View style={[styles.bodyTextContainer, { opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] }]}> 
            <Text style={styles.title}>Deviens hôte sur PUOL</Text>
            <Text style={styles.subtitle}>Dis-nous un peu plus pour t'aider à louer tes biens meublés.</Text>
          </Animated.View>

          <Animated.View style={[styles.formCard, { opacity: formOpacity, transform: [{ translateY: formTranslateY }] }]}> 
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
                  placeholder="Ex: Emmanuel"
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
              <Text style={styles.sectionTitle}>Quel type de biens meublés proposes-tu ?</Text>
            </View>
            <View style={styles.chipsContainer}>
              {furnitureOptions.map((option) => (
                <FurnitureChip
                  key={option.label}
                  option={option}
                  selected={selectedTypes.includes(option.label)}
                  onPress={() => toggleType(option.label)}
                />
              ))}
            </View>

            <View style={[styles.sectionHeader, { marginTop: 20 }]}> 
              <Text style={styles.sectionTitle}>Nombre de biens</Text>
            </View>
            <View style={styles.inventoryRow}>{inventoryOptions.map(renderInventoryOption)}</View>
          </Animated.View>

          <Animated.View style={[styles.ctaContainer, { opacity: ctaOpacity, transform: [{ translateY: ctaTranslateY }] }]}> 
            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={[styles.submitLabel, !canSubmit && styles.submitLabelDisabled]}>Envoyer</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <HostVerificationModal
        isVisible={modalStep === 'verify'}
        onClose={handleCloseModal}
        onVerify={handleVerify}
        isVerifying={isSubmitting}
        phoneNumber={formatE164PhoneNumber(phoneNumber, phoneCountry)}
      />

      <Modal visible={modalStep === 'success'} animationType="slide">
        <HostSuccessScreen onClose={handleCloseSuccess} />
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
  backButtonContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
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
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
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
});
