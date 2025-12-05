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

import { useAuth } from '@/src/contexts/AuthContext';
import {
  confirmOtpCode,
  findSupabaseProfileByPhone,
  getLastPhoneNumber,
  resetPhoneConfirmation,
  startPhoneSignIn,
} from '@/src/features/auth/phoneAuthService';
import { firebaseConfig } from '@/src/firebaseClient';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRY_OPTIONS,
  PhoneCountryOption,
  formatE164PhoneNumber,
  sanitizeNationalNumber,
} from '@/src/features/auth/phoneCountries';

interface LoginWithOTPScreenProps {
  visible: boolean;
  onClose: () => void;
  onAuthenticated?: () => void;
  onRequestSignUp?: (phoneE164: string) => void;
}

export const LoginWithOTPScreen: React.FC<LoginWithOTPScreenProps> = ({
  visible,
  onClose,
  onAuthenticated,
  onRequestSignUp,
}) => {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryOption>(DEFAULT_PHONE_COUNTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpMethod, setOtpMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [pendingSignupPhone, setPendingSignupPhone] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);
  const lastPhoneE164Ref = useRef<string | null>(null);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const phoneInputRef = useRef<TextInput | null>(null);

  const focusPhoneInput = () => {
    phoneInputRef.current?.focus();
  };

  const resetState = () => {
    setStep('phone');
    setPhoneNumber('');
    setOtp(['', '', '', '', '', '']);
    setIsSending(false);
    setIsVerifying(false);
    setErrorMessage(null);
    setShowSignUpPrompt(false);
    setIsCountryPickerOpen(false);
    resetPhoneConfirmation();
    lastPhoneE164Ref.current = null;
    setResendCooldown(0);
  };

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSendOTP = async () => {
    if (phoneNumber.length < phoneCountry.minLength || isSending) {
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const e164Phone = formatE164PhoneNumber(phoneNumber, phoneCountry);
      await startPhoneSignIn(e164Phone, recaptchaVerifier.current || undefined);
      lastPhoneE164Ref.current = e164Phone;
      setStep('otp');
      setResendCooldown(90);
      setIsCountryPickerOpen(false);
    } catch (error) {
      console.error('Firebase phone sign-in error', error);
      const message =
        error instanceof Error
          ? error.message
          : "Impossible d’envoyer le code. Vérifiez votre numéro et réessayez.";
      setErrorMessage(message);
    } finally {
      setIsSending(false);
    }
  };

  const applyOtpValue = (rawValue: string) => {
    const sanitized = rawValue.replace(/\D/g, '').slice(0, 6);
    const digits = sanitized.split('');
    while (digits.length < 6) {
      digits.push('');
    }
    setOtp(digits);
    setErrorMessage(null);
    setShowSignUpPrompt(false);

    if (sanitized.length === 6) {
      submitOtp(sanitized);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    if (value.length > 1) {
      applyOtpValue(value);
      return;
    }

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
      const { user, phoneNumber: confirmedPhone } = await confirmOtpCode(fullCode);
      const fallbackPhone = phoneNumber
        ? formatE164PhoneNumber(phoneNumber, phoneCountry)
        : lastPhoneE164Ref.current ?? getLastPhoneNumber();
      const normalizedPhone = confirmedPhone ?? fallbackPhone;

      if (!normalizedPhone) {
        throw new Error('missing_phone_number');
      }

      const profile = await findSupabaseProfileByPhone(normalizedPhone);

      if (!profile) {
        setPendingSignupPhone(normalizedPhone);
        setErrorMessage("Aucun compte n’est associé à ce numéro. Veuillez créer un compte s'il vous plait.");
        setShowSignUpPrompt(true);
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        return;
      }

      await refreshProfile();
      resetState();
      onAuthenticated?.();
    } catch (error) {
      console.error('Firebase confirm code error', error);
      setErrorMessage('Code invalide ou expiré.');
      setShowSignUpPrompt(false);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
    } else {
      handleClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                <Feather name="arrow-left" size={20} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Connexion</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'phone' ? (
                <>
                  <View style={styles.iconContainer}>
                    <Feather name="smartphone" size={32} color="#2ECC71" />
                  </View>

                  <Text style={styles.stepTitle}>Entrez votre numéro</Text>
                  <Text style={styles.stepSubtitle}>Nous vous enverrons un code de vérification</Text>

                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Numéro de téléphone</Text>
                    <Pressable style={styles.phoneInputContainer} onPress={focusPhoneInput}>
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
                        ref={phoneInputRef}
                        style={styles.phoneInput}
                        value={phoneNumber}
                        onChangeText={(text) => {
                          const sanitizedValue = sanitizeNationalNumber(text, phoneCountry);
                          setPhoneNumber(sanitizedValue);

                          if (sanitizedValue.length === phoneCountry.minLength) {
                            Keyboard.dismiss();
                          }
                        }}
                        placeholder={phoneCountry.inputPlaceholder}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="phone-pad"
                        maxLength={phoneCountry.maxLength}
                      />
                    </Pressable>
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
                              setPhoneNumber('');
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
                        <FontAwesome name="whatsapp" size={16} color="#2ECC71" />
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
                      (phoneNumber.length < phoneCountry.minLength || isSending) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={handleSendOTP}
                    disabled={phoneNumber.length < phoneCountry.minLength || isSending}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSending ? 'Envoi en cours…' : 'Envoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <Feather name="key" size={32} color="#2ECC71" />
                  </View>

                  <Text style={styles.stepTitle}>Entrez le code</Text>
                  <Text style={styles.stepSubtitle}>
                    Code envoyé au {phoneCountry.dialCode} {phoneNumber}
                  </Text>

                  <TextInput
                    style={styles.hiddenOtpInput}
                    value={otp.join('')}
                    onChangeText={applyOtpValue}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    importantForAutofill="yes"
                  />

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
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        editable={!isVerifying}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.resendButton, resendCooldown > 0 && styles.resendButtonDisabled]}
                    activeOpacity={0.7}
                    onPress={handleSendOTP}
                    disabled={resendCooldown > 0 || isSending}
                  >
                    <Text style={styles.resendButtonText}>
                      {resendCooldown > 0
                        ? `Renvoyer dans ${resendCooldown}s`
                        : isSending
                          ? 'Envoi en cours…'
                          : 'Renvoyer le code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              {showSignUpPrompt && onRequestSignUp ? (
                <TouchableOpacity
                  style={styles.createAccountButton}
                  onPress={() => {
                    if (!pendingSignupPhone) {
                      return;
                    }
                    resetState();
                    onRequestSignUp(pendingSignupPhone);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createAccountText}>Créer un compte</Text>
                </TouchableOpacity>
              ) : null}
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
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#111827',
    paddingLeft: 12,
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
  resendButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    fontFamily: 'Manrope',
    fontSize: 14,
    marginTop: 12,
  },
  hiddenOtpInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  devHint: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontFamily: 'Manrope',
    fontSize: 12,
    marginBottom: 4,
  },
  createAccountButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  createAccountText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#2ECC71',
  },
});
