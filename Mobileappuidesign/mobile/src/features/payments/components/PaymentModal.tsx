import React, { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  findNodeHandle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { PolicyModal } from '../../../components/ui/PolicyModal';
import { useNotchPayPayment } from '@/src/hooks/useNotchPayPayment';
import { useAuth } from '@/src/contexts/AuthContext';
import { openUssd, extractUssdCommand } from '@/src/utils/ussd';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (provider: 'orange' | 'mtn' | 'card') => void | Promise<void>;
  amount: number;
  title: string;
  description: string;
  onBack?: () => void;
  infoMessage?: string;
  // Nouveaux props pour la logique de paiement
  purpose?: 'visit' | 'booking';
  payerProfileId?: string;
  hostProfileId?: string;
  relatedId?: string;
  customerPrice?: number; // Prix payé par le client (pour les réservations)
}

type PaymentMethod = 'orange' | 'mtn' | 'card';

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess, 
  amount, 
  title, 
  description, 
  onBack, 
  infoMessage,
  purpose,
  payerProfileId,
  hostProfileId,
  relatedId,
  customerPrice
}) => {
  const router = useRouter();
  const { supabaseProfile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [showPolicyError, setShowPolicyError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const phoneInputRef = useRef<TextInput | null>(null);
  const cardNumberRef = useRef<TextInput | null>(null);
  const cardNameRef = useRef<TextInput | null>(null);
  const cardExpiryRef = useRef<TextInput | null>(null);
  const cardCvvRef = useRef<TextInput | null>(null);
  const [showWarningMessage, setShowWarningMessage] = useState(false);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState('');

  // Hook NotchPay
  const {
    status,
    isLoading,
    isPolling,
    authorizationUrl,
    lockedChannel,
    action,
    confirmMessage,
    error: paymentError,
    startPayment,
    reset: resetPayment,
  } = useNotchPayPayment({
    onSuccess: async (payment) => {
      console.log('[PaymentModal] ✅ Paiement réussi:', payment.id);
      Alert.alert('Succès', 'Paiement confirmé avec succès');
      handleClose();
      await onSuccess(paymentMethod);
    },
    onFailed: (payment) => {
      console.log('[PaymentModal] ❌ Paiement échoué:', payment.failure_reason);
      Alert.alert('Paiement échoué', payment.failure_reason || 'Veuillez réessayer');
      setIsProcessing(false);
    },
    onTimeout: () => {
      console.log('[PaymentModal] ⏱️ Timeout du paiement');
      setIsProcessing(false);
    },
  });

  const formattedCardNumber = cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim();

  const handlePhoneNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setPhoneNumber(digits);
    if (digits.length === 9) {
      Keyboard.dismiss();
    }
  };

  const scrollToInput = (input: TextInput | null) => {
    if (!input || !scrollViewRef.current) return;
    const scrollHandle = findNodeHandle(scrollViewRef.current);
    const inputHandle = findNodeHandle(input);
    if (!scrollHandle || inputHandle == null) return;
    UIManager.measureLayout(
      inputHandle,
      scrollHandle,
      () => {},
      (_x: number, y: number) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
      },
    );
  };

  const handleCardNumberChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    setCardNumber(digits);
  };

  const handleCardExpiryChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      setCardExpiry(digits);
    } else {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    }
  };

  const handleCvvChange = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, 3);
    setCardCVV(next);
    if (next.length === 3) {
      Keyboard.dismiss();
    }
  };

  const validatePayment = () => {
    if (paymentMethod === 'card') {
      if (cardNumber.length < 16) {
        return 'Veuillez entrer un numéro de carte valide';
      }
      if (!cardName.trim()) {
        return 'Veuillez entrer le nom sur la carte';
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        return "Veuillez entrer une date d'expiration valide";
      }
      if (cardCVV.length < 3) {
        return 'Veuillez entrer un CVV valide';
      }
    } else {
      if (phoneNumber.length < 9) {
        return 'Veuillez entrer un numéro de téléphone valide';
      }
    }

    if (!acceptedPolicy) {
      return 'Vous devez accepter les politiques de paiement';
    }

    return null;
  };

  // Gérer l'affichage du message d'avertissement après 30 secondes
  useEffect(() => {
    if (status === 'polling' || isPolling) {
      warningTimeoutRef.current = setTimeout(() => {
        setShowWarningMessage(true);
      }, 30000); // 30 secondes
    } else {
      // Nettoyer le timeout et réinitialiser le message si le statut change
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      setShowWarningMessage(false);
    }

    return () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [status, isPolling]);

  const resetState = () => {
    setPaymentMethod('orange');
    setPhoneNumber('');
    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCVV('');
    setAcceptedPolicy(false);
    setShowPolicyError(false);
    setIsProcessing(false);
    setShowWarningMessage(false);
  };

  const handleClose = () => {
    resetState();
    resetPayment();
    onClose();
  };

  const handlePayment = async () => {
    console.log('[PaymentModal] Début handlePayment');
    const error = validatePayment();
    if (error) {
      console.log('[PaymentModal] Erreur validation:', error);
      if (!acceptedPolicy) {
        setShowPolicyError(true);
      }
      Alert.alert('Paiement', error);
      return;
    }

    console.log('[PaymentModal] Validation OK, début traitement paiement');
    setShowPolicyError(false);
    setIsProcessing(true);

    try {
      // Mapper le channel pour NotchPay
      const channelMap = {
        orange: 'cm.orange',
        mtn: 'cm.mtn',
        card: 'card'
      } as const;

      const channel = channelMap[paymentMethod];

      // Normaliser le numéro de téléphone: juste les 9 derniers chiffres
      const digits = phoneNumber.replace(/\D/g, '').slice(-9);
      const normalizedPhone = digits ? `+237${digits}` : '';
      console.log('[PaymentModal] 📞 Téléphone normalisé (+237):', {
        original: phoneNumber,
        normalized: normalizedPhone,
      });

      // Vérifier la présence du relatedId (booking/visite)
      if (!relatedId) {
        console.error('[PaymentModal] ❌ relatedId manquant, paiement impossible');
        Alert.alert('Paiement', 'Aucune réservation/visite associée. Relance la création avant de payer.');
        setIsProcessing(false);
        return;
      }

      // Appeler le hook NotchPay
      await startPayment({
        payerProfileId: supabaseProfile?.id || payerProfileId || '',
        purpose: (purpose as any) || 'booking',
        relatedId: relatedId || '',
        amount,
        channel,
        customerPhone: normalizedPhone,
      });
    } catch (error) {
      const serializedError = (() => {
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      })();

      console.error('[PaymentModal] Erreur lors du paiement:', error);
      console.error('[PaymentModal] Stack trace:', error instanceof Error ? error.stack : 'No stack');
      console.error('[PaymentModal] Détails sérialisés:', serializedError);

      Alert.alert(
        'Erreur de paiement',
        "Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer."
      );
      setIsProcessing(false);
    }
  };

  const paymentMethodButton = (
    label: string,
    value: PaymentMethod,
    activeStyle: any,
    icon: React.ReactNode,
  ) => (
    <TouchableOpacity
      style={[styles.paymentMethodButton, paymentMethod === value && activeStyle]}
      onPress={() => setPaymentMethod(value)}
      activeOpacity={0.7}
      disabled={isProcessing || isPolling}
    >
      <View style={styles.paymentMethodIcon}>{icon}</View>
      <Text style={styles.paymentMethodLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Afficher le statut de paiement (polling)
  if (status === 'polling' || isPolling) {
    // Mode confirmation USSD pour Mobile Money
    const showUssdConfirmation = (lockedChannel === 'cm.orange' || lockedChannel === 'cm.mtn') && 
                                  action === 'confirm' && 
                                  confirmMessage;
    
    const handleOpenUssd = async () => {
      await openUssd(confirmMessage!);
    };

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <View style={styles.pollingContainer}>
                {showUssdConfirmation ? (
                  <>
                    <Feather name="smartphone" size={48} color="#2ECC71" style={{ marginBottom: 16 }} />
                    <Text style={styles.pollingTitle}>Confirmation requise</Text>
                    
                    <View style={styles.pollingIndicator}>
                      <ActivityIndicator size="small" color="#2ECC71" />
                      <Text style={styles.pollingIndicatorText}>Vérification en cours</Text>
                    </View>

                    {showWarningMessage && (
                      <View style={styles.warningMessageContainer}>
                        <Text style={styles.warningMessageText}>
                          Une fois le code validé, la vérification peut prendre un peu plus de temps afin de garantir un paiement sécurisé🔐. Veuillez patienter s'il vous plaît.
                        </Text>
                      </View>
                    )}

                    <Text style={styles.ussdHelpText}>
                      Tu vas recevoir un message d'{lockedChannel === 'cm.orange' ? 'Orange' : 'MTN'} afin de valider ton paiement. Une fois le code validé, la réservation se confirmera automatiquement.
                    </Text>
                  </>
                ) : lockedChannel === 'card' && authorizationUrl ? (
                  <>
                    <ActivityIndicator size="large" color="#2ECC71" />
                    <Text style={styles.pollingTitle}>Vérification du paiement</Text>
                    <Text style={styles.pollingSubtitle}>Complétez votre paiement par carte</Text>
                    <View style={styles.webViewContainer}>
                      <WebView
                        source={{ uri: authorizationUrl }}
                        style={styles.webView}
                        startInLoadingState
                        renderLoading={() => <ActivityIndicator size="large" color="#2ECC71" />}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color="#2ECC71" />
                    <Text style={styles.pollingTitle}>Vérification du paiement</Text>
                    <Text style={styles.pollingSubtitle}>Confirme sur ton téléphone</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }


  // Afficher la modale d'erreur de validation du numéro
  if (status === 'validation_error') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Numéro invalide</Text>
                <Text style={styles.errorSubtitle}>{paymentError || 'Une erreur est survenue'}</Text>

                <View style={styles.errorButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Afficher l'erreur
  if (status === 'failed' || status === 'error') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.container}>
          <View style={styles.overlay}>
            <View style={styles.modalContent}>
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Paiement échoué</Text>
                <Text style={styles.errorSubtitle}>{paymentError || 'Une erreur est survenue'}</Text>

                <View style={styles.errorButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={handlePayment}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Réessayer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => {
                      handleClose();
                      router.push('/support' as never);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonSecondaryText}>Contacter le support</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonSecondaryText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Afficher le formulaire de paiement
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              {onBack ? (
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                  <Feather name="arrow-left" size={20} color="#111827" />
                </TouchableOpacity>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>{title}</Text>
                <Text style={styles.headerSubtitle}>{description}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              {infoMessage ? (
                <View style={styles.infoMessageCard}>
                  <Text style={styles.infoMessageTitle}>Important</Text>
                  <Text style={styles.infoMessageText}>{infoMessage}</Text>
                </View>
              ) : null}
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant à payer</Text>
                <Text style={styles.amountValue}>{amount.toLocaleString('fr-FR')} FCFA</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Moyen de paiement</Text>
                <View style={styles.paymentMethodsGrid}>
                  {paymentMethodButton(
                    'Orange Money',
                    'orange',
                    styles.paymentMethodButtonActiveOrange,
                    <View style={styles.orangeMoneyIcon}>
                      <Text style={styles.orangeMoneyText}>OM</Text>
                    </View>,
                  )}
                  {paymentMethodButton(
                    'MTN MoMo',
                    'mtn',
                    styles.paymentMethodButtonActiveMTN,
                    <View style={styles.mtnMoneyIcon}>
                      <Text style={styles.mtnMoneyText}>MTN</Text>
                    </View>,
                  )}
                  {paymentMethodButton(
                    'Carte bancaire',
                    'card',
                    styles.paymentMethodButtonActiveCard,
                    <Feather name="credit-card" size={28} color={paymentMethod === 'card' ? '#2ECC71' : '#5C6675'} />,
                  )}
                </View>
              </View>

              {(paymentMethod === 'orange' || paymentMethod === 'mtn') && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Numéro de téléphone</Text>
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCode}>
                      <Text style={styles.flag}>🇨🇲</Text>
                      <Text style={styles.prefix}>+237</Text>
                    </View>
                    <TextInput
                      ref={phoneInputRef}
                      style={styles.phoneInput}
                      value={phoneNumber}
                      onChangeText={handlePhoneNumberChange}
                      placeholder="6 XX XX XX XX"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      maxLength={9}
                      returnKeyType="done"
                      onFocus={() => scrollToInput(phoneInputRef.current)}
                    />
                  </View>
                </View>
              )}

              {paymentMethod === 'card' && (
                <View style={styles.section}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Numéro de carte</Text>
                    <TextInput
                      ref={cardNumberRef}
                      style={styles.textInput}
                      value={formattedCardNumber}
                      onChangeText={handleCardNumberChange}
                      placeholder="1234 5678 9012 3456"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={19}
                      onFocus={() => scrollToInput(cardNumberRef.current)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nom sur la carte</Text>
                    <TextInput
                      ref={cardNameRef}
                      style={styles.textInput}
                      value={cardName}
                      onChangeText={(text) => setCardName(text.toUpperCase())}
                      placeholder="JEAN DUPONT"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      onFocus={() => scrollToInput(cardNameRef.current)}
                    />
                  </View>
                  <View style={styles.cardDetailsRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Date d'expiration</Text>
                      <TextInput
                        ref={cardExpiryRef}
                        style={styles.textInput}
                        value={cardExpiry}
                        onChangeText={handleCardExpiryChange}
                        placeholder="MM/AA"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={5}
                        onFocus={() => scrollToInput(cardExpiryRef.current)}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                        ref={cardCvvRef}
                        style={styles.textInput}
                        value={cardCVV}
                        onChangeText={handleCvvChange}
                        placeholder="123"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={3}
                        secureTextEntry
                        onFocus={() => scrollToInput(cardCvvRef.current)}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.securityBadge}>
                <Feather name="credit-card" size={16} color="#2ECC71" />
                <Text style={styles.securityText}>Paiement sécurisé</Text>
              </View>

              <View style={[styles.policyContainer, showPolicyError && styles.policyContainerError]}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => {
                    setAcceptedPolicy((prev) => !prev);
                    if (!acceptedPolicy) {
                      setShowPolicyError(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkboxBox, acceptedPolicy && styles.checkboxBoxChecked]}>
                    {acceptedPolicy && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <Text style={[styles.policyText, showPolicyError && styles.policyTextError]}>
                  ✅ J'ai lu et j'accepte les politiques de paiement de PUOL.{' '}
                  <Text style={styles.policyLink} onPress={() => setShowPolicyModal(true)}>
                    Voir la politique
                  </Text>
                </Text>
              </View>

              {showPolicyError && (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={styles.errorText}>Vous devez accepter les politiques de paiement pour continuer.</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.confirmButton, isProcessing && styles.confirmButtonDisabled]}
                onPress={handlePayment}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.confirmButtonText}>Traitement en cours...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmButtonText}>Valider votre réservation</Text>
                )}
              </TouchableOpacity>
            </View>
            <PolicyModal
              visible={showPolicyModal}
              onClose={() => setShowPolicyModal(false)}
              onAccept={() => {
                setAcceptedPolicy(true);
                setShowPolicyError(false);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 96,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    maxHeight: '80%',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  backIcon: {
    fontSize: 20,
    color: '#111827',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  infoMessageCard: {
    backgroundColor: 'rgba(46,204,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.25)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    marginBottom: 16,
  },
  infoMessageTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111827',
  },
  infoMessageText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
    textAlign: 'center',
  },
  amountContainer: {
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '700',
    color: '#2ECC71',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodButtonActiveOrange: {
    borderColor: '#FF6B00',
    backgroundColor: 'rgba(255, 107, 0, 0.05)',
  },
  paymentMethodButtonActiveMTN: {
    borderColor: '#FFCC00',
    backgroundColor: 'rgba(255, 204, 0, 0.05)',
  },
  paymentMethodButtonActiveCard: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
  },
  paymentMethodIcon: {
    marginBottom: 8,
  },
  orangeMoneyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orangeMoneyText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mtnMoneyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFCC00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mtnMoneyText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  cardIcon: {
    fontSize: 32,
  },
  paymentMethodLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 14,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  textInput: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 16,
  },
  securityText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  policyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  policyContainerError: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderColor: '#EF4444',
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  checkboxCheck: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  policyText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  policyTextError: {
    color: '#DC2626',
  },
  policyLink: {
    color: '#2ECC71',
    textDecorationLine: 'underline',
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#DC2626',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  confirmButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollingContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pollingTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  pollingSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  webViewContainer: {
    width: '100%',
    height: 400,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webView: {
    flex: 1,
  },
  errorContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorButtons: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2ECC71',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  buttonSecondaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  ussdConfirmationBlock: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.25)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    alignItems: 'center',
  },
  ussdConfirmationLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  ussdConfirmationCode: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#2ECC71',
    textAlign: 'center',
    letterSpacing: 2,
  },
  ussdConfirmationText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 24,
  },
  ussdHelpText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 19,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  pollingIndicatorText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  warningMessageContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 16,
  },
  warningMessageText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaymentModal;
