import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Pressable,
} from 'react-native';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { Feather, FontAwesome } from '@expo/vector-icons';

import type { AuthUser } from '@/src/contexts/AuthContext';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  confirmOtpCode,
  createSupabaseProfile,
  findSupabaseProfileByPhone,
  resetPhoneConfirmation,
  startPhoneSignIn,
} from '@/src/features/auth/phoneAuthService';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  formatE164PhoneNumber,
  parseE164PhoneNumber,
  sanitizeNationalNumber,
} from '@/src/features/auth/phoneCountries';
import { firebaseConfig } from '@/src/firebaseClient';

interface SignUpScreenProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialPhoneE164?: string | null;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({ visible, onClose, onSuccess, initialPhoneE164 }) => {
  const [step, setStep] = useState<'info' | 'phone' | 'otp'>('info');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Homme',
    phone: '',
  });
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const lastRequestedPhoneRef = useRef<string | null>(null);
  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (!visible || !initialPhoneE164) {
      return;
    }

    const { country, nationalNumber } = parseE164PhoneNumber(initialPhoneE164);
    setPhoneCountry(country);
    setFormData((prev) => ({ ...prev, phone: nationalNumber }));
  }, [initialPhoneE164, visible]);

  const resetState = () => {
    setStep('info');
    setFormData({ firstName: '', lastName: '', gender: 'Homme', phone: '' });
    setPhoneCountry(DEFAULT_PHONE_COUNTRY);
    setOtpMethod('sms');
    setOtp(['', '', '', '', '', '']);
    setIsSending(false);
    setIsVerifying(false);
    setErrorMessage(null);
    setIsCountryPickerOpen(false);
    resetPhoneConfirmation();
    lastRequestedPhoneRef.current = null;
  };

  const handleContinueToPhone = () => {
    if (formData.firstName && formData.lastName) {
      setErrorMessage(null);
      setStep('phone');
    }
  };

  const getFormattedPhone = () => formatE164PhoneNumber(formData.phone, phoneCountry);

  const handleSendOTP = async () => {
    if (formData.phone.length < phoneCountry.minLength || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const e164Phone = getFormattedPhone();
      if (!e164Phone) {
        throw new Error('Numéro invalide');
      }

      const existingProfile = await findSupabaseProfileByPhone(e164Phone);
      if (existingProfile) {
        setErrorMessage('Un compte existe déjà avec ce numéro.');
        return;
      }

      await startPhoneSignIn(e164Phone, recaptchaVerifier.current || undefined);
      lastRequestedPhoneRef.current = e164Phone;
      setStep('otp');
      setIsCountryPickerOpen(false);
    } catch (error) {
      console.error('Firebase phone sign-up error', error);
      setErrorMessage("Impossible d’envoyer le code. Vérifiez votre numéro et réessayez.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrorMessage(null);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        submitOtp(fullOtp);
      }
    }
  };

  const handleOTPKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (fullCode: string) => {
    if (isVerifying) {
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const { user, phoneNumber } = await confirmOtpCode(fullCode);
      const fallbackPhone = formData.phone ? getFormattedPhone() : lastRequestedPhoneRef.current;
      const normalizedPhone = phoneNumber ?? fallbackPhone;

      if (!normalizedPhone) {
        throw new Error('missing_phone_number');
      }

      const existingProfile = await findSupabaseProfileByPhone(normalizedPhone);
      if (existingProfile) {
        setErrorMessage('Ce numéro est déjà associé à un compte. Utilisez la connexion.');
        setStep('phone');
        return;
      }

      const createdProfile = await createSupabaseProfile({
        user,
        phone: normalizedPhone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender,
      });

      await refreshProfile();
      resetState();
      onSuccess(createdProfile);
    } catch (error) {
      console.error('Firebase signup confirm error', error);
      setErrorMessage('Code invalide ou erreur de création.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
    } else if (step === 'phone') {
      setStep('info');
    } else {
      resetState();
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Créer un compte</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {step === 'info' && (
                <>
                  <View style={styles.iconContainer}>
                    <Feather name="user" size={32} color="#2ECC71" />
                  </View>

                  <Text style={styles.stepTitle}>Vos informations</Text>
                  <Text style={styles.stepSubtitle}>Renseignez vos informations personnelles</Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Prénom</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.firstName}
                      onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                      placeholder="Votre prénom"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Nom</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.lastName}
                      onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                      placeholder="Votre nom"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Genre</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[styles.genderButton, formData.gender === 'Homme' && styles.genderButtonActive]}
                        onPress={() => setFormData({ ...formData, gender: 'Homme' })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.genderButtonText, formData.gender === 'Homme' && styles.genderButtonTextActive]}
                        >
                          Homme
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.genderButton, formData.gender === 'Femme' && styles.genderButtonActive]}
                        onPress={() => setFormData({ ...formData, gender: 'Femme' })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.genderButtonText, formData.gender === 'Femme' && styles.genderButtonTextActive]}
                        >
                          Femme
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitButton, (!formData.firstName || !formData.lastName) && styles.submitButtonDisabled]}
                    onPress={handleContinueToPhone}
                    disabled={!formData.firstName || !formData.lastName}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitButtonText}>Continuer</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'phone' && (
                <>
                  <View style={styles.iconContainer}>
                    <Feather name="smartphone" size={32} color="#2ECC71" />
                  </View>

                  <Text style={styles.stepTitle}>Votre numéro</Text>
                  <Text style={styles.stepSubtitle}>Nous vous enverrons un code de vérification</Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                    <View style={styles.phoneInputContainer}>
                      <Pressable
                        style={styles.countryDropdown}
                        onPress={() => setIsCountryPickerOpen((prev) => !prev)}
                      >
                        <View style={styles.dropdownSelected}>
                          <Text style={styles.flag}>{phoneCountry.flag}</Text>
                          <Text style={styles.prefix}>{phoneCountry.dialCode}</Text>
                          <Text style={styles.dropdownArrow}>{isCountryPickerOpen ? '▲' : '▼'}</Text>
                        </View>
                      </Pressable>
                      <TextInput
                        style={styles.phoneInput}
                        value={formData.phone}
                        onChangeText={(text) => {
                          const sanitizedValue = sanitizeNationalNumber(text, phoneCountry);
                          setFormData({ ...formData, phone: sanitizedValue });

                          if (sanitizedValue.length === phoneCountry.minLength) {
                            Keyboard.dismiss();
                          }
                        }}
                        placeholder={phoneCountry.inputPlaceholder}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        maxLength={phoneCountry.maxLength}
                      />
                    </View>
                    {isCountryPickerOpen ? (
                      <View style={styles.dropdownList}>
                        {PHONE_COUNTRY_OPTIONS.map((country) => (
                          <TouchableOpacity
                            key={country.code}
                            style={[
                              styles.dropdownItem,
                              phoneCountry.code === country.code && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setPhoneCountry(country);
                              setFormData({ ...formData, phone: '' });
                              setIsCountryPickerOpen(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.flag}>{country.flag}</Text>
                            <View style={styles.dropdownTextWrapper}>
                              <Text style={styles.dropdownName}>{country.name}</Text>
                              <Text style={styles.dropdownDial}>{country.dialCode}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Recevoir le code par</Text>
                    <View style={styles.methodButtons}>
                      <TouchableOpacity
                        style={[styles.methodButton, otpMethod === 'sms' && styles.methodButtonActive]}
                        onPress={() => setOtpMethod('sms')}
                        activeOpacity={0.7}
                      >
                        <Feather name="message-circle" size={16} color="#2ECC71" />
                        <Text
                          style={[styles.methodButtonText, otpMethod === 'sms' && styles.methodButtonTextActive]}
                        >
                          SMS
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.methodButton, otpMethod === 'whatsapp' && styles.methodButtonActive]}
                        onPress={() => setOtpMethod('whatsapp')}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="whatsapp" size={18} color="#2ECC71" />
                        <Text
                          style={[styles.methodButtonText, otpMethod === 'whatsapp' && styles.methodButtonTextActive]}
                        >
                          WhatsApp
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (formData.phone.length < phoneCountry.minLength || isSending) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={handleSendOTP}
                    disabled={formData.phone.length < phoneCountry.minLength || isSending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSending ? 'Envoi en cours…' : 'Envoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'otp' && (
                <>
                  <View style={styles.iconContainer}>
                    <Feather name="grid" size={32} color="#2ECC71" />
                  </View>

                  <Text style={styles.stepTitle}>Entrez le code</Text>
                  <Text style={styles.stepSubtitle}>
                    Code envoyé au {phoneCountry.dialCode} {formData.phone}
                  </Text>

                  <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          otpRefs.current[index] = ref;
                        }}
                        style={styles.otpInput}
                        value={digit}
                        onChangeText={(value) => handleOTPChange(index, value)}
                        onKeyPress={({ nativeEvent }) => handleOTPKeyPress(index, nativeEvent.key)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!isVerifying}
                      />
                    ))}
                  </View>

                  <TouchableOpacity style={styles.resendButton} activeOpacity={0.7} onPress={handleSendOTP}>
                    <Text style={styles.resendButtonText}>
                      {isSending ? 'Envoi en cours…' : 'Renvoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: Platform.OS === 'ios' ? 32 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#111827',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  scrollContent: {
    padding: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconEmoji: {
    fontSize: 32,
  },
  stepTitle: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#111827',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  countryDropdown: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dropdownSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownArrow: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#6B7280',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
  },
  dropdownTextWrapper: {
    flexDirection: 'column',
  },
  dropdownName: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  dropdownDial: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  flag: {
    fontSize: 20,
  },
  prefix: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  phoneInput: {
    flex: 1,
    fontFamily: 'Manroke',
    fontSize: 16,
    color: '#111827',
    paddingLeft: 12,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  genderButtonActive: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
  },
  genderButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  genderButtonTextActive: {
    color: '#2ECC71',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  methodButtonActive: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
  },
  methodIcon: {
    fontSize: 20,
  },
  methodButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  methodButtonTextActive: {
    color: '#2ECC71',
  },
  submitButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    textAlign: 'center',
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    fontFamily: 'Manrope',
    fontSize: 14,
    marginTop: 12,
  },
  devHint: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontFamily: 'Manrope',
    fontSize: 12,
    marginBottom: 4,
  },
});
