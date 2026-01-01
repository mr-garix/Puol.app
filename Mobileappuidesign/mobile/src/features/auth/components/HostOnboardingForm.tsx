import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  formatE164PhoneNumber,
  sanitizeNationalNumber,
} from '../phoneCountries';
import { scaleFont } from '../../../theme/typography';

const furnitureOptions = ['Chambre meublée', 'Studio meublé', 'Appartement meublé', 'Maison meublée'];
const inventoryOptions = ['1', '2 à 5', '5 et plus'];
const PUOL_GREEN = '#2ECC71';
const PUOL_GREEN_LIGHT = 'rgba(46, 204, 113, 0.12)';

interface HostOnboardingFormProps {
  onSubmit: (data: HostOnboardingData) => Promise<void>;
  isSubmitting: boolean;
}

export interface HostOnboardingData {
  firstName: string;
  lastName: string;
  phoneCountry: PhoneCountryOption;
  phoneNumber: string;
  district: string;
  city: string;
  selectedTypes: string[];
  inventory: string;
}

export const HostOnboardingForm: React.FC<HostOnboardingFormProps> = ({ onSubmit, isSubmitting }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string | null>(null);

  const canSubmit =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    district.trim().length > 1 &&
    city.trim().length > 1 &&
    selectedTypes.length > 0 &&
    inventory !== null &&
    phoneNumber.trim().length >= 8;

  const toggleFurnitureType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    await onSubmit({
      firstName,
      lastName,
      phoneCountry,
      phoneNumber,
      district,
      city,
      selectedTypes,
      inventory: inventory!,
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Devenez hôte PUOL</Text>
          <Text style={styles.subtitle}>Rejoignez notre communauté et commencez à recevoir des réservations</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Votre prénom"
                placeholderTextColor="#9CA3AF"
                editable={!isSubmitting}
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Votre nom"
                placeholderTextColor="#9CA3AF"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Quartier</Text>
            <TextInput
              style={styles.input}
              value={district}
              onChangeText={setDistrict}
              placeholder="Dans quel quartier opérez-vous ?"
              placeholderTextColor="#9CA3AF"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ville</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Dans quelle ville opérez-vous ?"
              placeholderTextColor="#9CA3AF"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <TouchableOpacity
              style={[styles.phoneInput, isSubmitting && styles.disabledInput]}
              onPress={() => !isSubmitting && setIsCountryPickerOpen(true)}
              disabled={isSubmitting}
            >
              <Text style={styles.countryCode}>{phoneCountry.code}</Text>
              <TextInput
                style={styles.phoneField}
                value={phoneNumber}
                onChangeText={(text) => sanitizeNationalNumber(text, phoneCountry)}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!isSubmitting}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Type de biens meublés</Text>
            <View style={styles.optionsGrid}>
              {furnitureOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    selectedTypes.includes(option) && styles.optionChipSelected,
                    isSubmitting && styles.disabledChip,
                  ]}
                  onPress={() => !isSubmitting && toggleFurnitureType(option)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.optionText, selectedTypes.includes(option) && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Combien de biens meublés ?</Text>
            <View style={styles.optionsRow}>
              {inventoryOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.inventoryChip,
                    inventory === option && styles.inventoryChipSelected,
                    isSubmitting && styles.disabledChip,
                  ]}
                  onPress={() => !isSubmitting && setInventory(option)}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.optionText, inventory === option && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, canSubmit && !isSubmitting && styles.submitButtonEnabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          <Text style={[styles.submitButtonText, canSubmit && !isSubmitting && styles.submitButtonTextEnabled]}>
            {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isCountryPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setIsCountryPickerOpen(false)} activeOpacity={1}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choisir le pays</Text>
              <TouchableOpacity onPress={() => setIsCountryPickerOpen(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerScroll}>
              {PHONE_COUNTRY_OPTIONS.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryOption,
                    phoneCountry.code === country.code && styles.countryOptionSelected,
                  ]}
                  onPress={() => {
                    setPhoneCountry(country);
                    setIsCountryPickerOpen(false);
                  }}
                >
                  <Text style={styles.countryOptionText}>{`${country.flag} ${country.name} (${country.code})`}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: {
    fontFamily: 'Manrope',
    fontSize: scaleFont(28),
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: scaleFont(16),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: scaleFont(24),
  },
  form: { gap: 20 },
  row: { flexDirection: 'row' },
  inputContainer: { gap: 8 },
  label: { fontFamily: 'Manrope', fontSize: scaleFont(14), fontWeight: '600', color: '#374151' },
  input: {
    fontFamily: 'Manrope',
    fontSize: scaleFont(16),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0F172A',
  },
  disabledInput: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countryCode: { fontFamily: 'Manrope', fontSize: scaleFont(16), color: '#6B7280', marginRight: 8 },
  phoneField: { flex: 1, fontFamily: 'Manrope', fontSize: scaleFont(16), color: '#0F172A' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  optionChipSelected: { backgroundColor: PUOL_GREEN_LIGHT, borderColor: PUOL_GREEN },
  disabledChip: { opacity: 0.5 },
  optionText: { fontFamily: 'Manrope', fontSize: scaleFont(13), color: '#374151' },
  optionTextSelected: { color: PUOL_GREEN, fontWeight: '600' },
  optionsRow: { flexDirection: 'row', gap: 8 },
  inventoryChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  inventoryChipSelected: { backgroundColor: PUOL_GREEN_LIGHT, borderColor: PUOL_GREEN },
  submitButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  submitButtonEnabled: { backgroundColor: PUOL_GREEN },
  submitButtonText: { fontFamily: 'Manrope', fontSize: scaleFont(16), fontWeight: '600', color: '#9CA3AF' },
  submitButtonTextEnabled: { color: '#FFFFFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: { fontFamily: 'Manrope', fontSize: scaleFont(18), fontWeight: '700', color: '#0F172A' },
  pickerScroll: { flex: 1 },
  countryOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  countryOptionSelected: { backgroundColor: PUOL_GREEN_LIGHT },
  countryOptionText: { fontFamily: 'Manrope', fontSize: scaleFont(16), color: '#0F172A' },
});
