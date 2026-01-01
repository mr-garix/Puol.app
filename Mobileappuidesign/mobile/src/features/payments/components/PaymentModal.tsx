import React, { useRef, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { PolicyModal } from '../../../components/ui/PolicyModal';
import { createPaymentAndEarning } from '../../../lib/services/payments';
import { markBookingPaid, cancelBookingAfterPaymentFailure } from '@/src/features/bookings/services';
import { supabase } from '@/src/supabaseClient';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
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
  };

  const handleClose = () => {
    resetState();
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
      // Mapper le provider pour la base de données
      const providerMap = {
        orange: 'orange_money',
        mtn: 'mtn_momo',
        card: 'card'
      } as const;

      const dbProvider = providerMap[paymentMethod];

      // Si on a les informations nécessaires, créer le paiement dans Supabase
      if (purpose && payerProfileId) {
        let finalHostProfileId = hostProfileId;
        
        // Si hostProfileId n'est pas fourni, tenter de le récupérer depuis la réservation/listing
        if (!finalHostProfileId && relatedId) {
          console.log('[PaymentModal] hostProfileId manquant, tentative de récupération via booking/listing');
          try {
            const { data: bookingRow, error: bookingError } = await supabase
              .from('bookings')
              .select('listing:listing_id(host_id)')
              .eq('id', relatedId)
              .maybeSingle();

            if (bookingError) {
              console.error('[PaymentModal] Erreur fetch booking pour host_profile_id', bookingError);
            }

            finalHostProfileId = (bookingRow as any)?.listing?.host_id ?? finalHostProfileId;

            // Si toujours rien, tenter via listing directement (si relatedId est un listing_id)
            if (!finalHostProfileId) {
              const { data: listingRow, error: listingError } = await supabase
                .from('listings')
                .select('host_id')
                .eq('id', relatedId)
                .maybeSingle();

              if (listingError) {
                console.error('[PaymentModal] Erreur fetch listing pour host_id', listingError);
              }

              finalHostProfileId = (listingRow as any)?.host_id ?? finalHostProfileId;
            }
          } catch (err) {
            console.error('[PaymentModal] Exception récupération host_profile_id', err);
          }
        }
        
        if (!finalHostProfileId) {
          console.error('[PaymentModal] hostProfileId toujours manquant après fetch');
          setIsProcessing(false);
          Alert.alert(
            'Paiement impossible',
            'Impossible de récupérer le propriétaire du logement. Réessayez plus tard ou contactez le support.'
          );
          return;
        }
        
        console.log('[PaymentModal] Appel de createPaymentAndEarning avec:', {
          purpose,
          payerProfileId,
          hostProfileId: finalHostProfileId,
          relatedId,
          provider: dbProvider,
          customerPrice: purpose === 'booking' ? customerPrice : undefined,
        });
        
        await createPaymentAndEarning({
          payerProfileId,
          hostProfileId: finalHostProfileId,
          purpose,
          relatedId,
          provider: dbProvider,
          customerPrice: purpose === 'booking' ? customerPrice : undefined,
        });
        
        // Pour les bookings : valider la réservation après paiement
        if (purpose === 'booking' && relatedId) {
          await markBookingPaid(relatedId);
        }
        
        console.log('[PaymentModal] Paiement créé avec succès');
      } else {
        console.warn('[PaymentModal] Informations manquantes:', {
          purpose,
          payerProfileId,
          hostProfileId,
        });
        setIsProcessing(false);
        Alert.alert(
          'Paiement impossible',
          'Informations de paiement incomplètes. Veuillez réessayer plus tard.'
        );
        return;
      }

      // Simuler un délai pour l'UX
      console.log('[PaymentModal] Simulation délai UX...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('[PaymentModal] Fin traitement, appel onSuccess');
      setIsProcessing(false);
      
      try {
        console.log('[PaymentModal] Appel onSuccess callback...');
        const result = await onSuccess();
        console.log('[PaymentModal] onSuccess callback retourné:', result);
        console.log('[PaymentModal] onSuccess callback exécuté avec succès');
        // Le parent gère la fermeture via onSuccess
      } catch (callbackError) {
        console.error('[PaymentModal] Erreur dans onSuccess callback:', callbackError);
        console.error('[PaymentModal] Stack trace callback:', callbackError instanceof Error ? callbackError.stack : 'No stack');
        // Fermer en cas d'erreur callback pour éviter le figement
        handleClose();
      }
    } catch (error) {
      // En cas d'échec paiement, annuler le booking et libérer les dates
      if (purpose === 'booking' && relatedId) {
        try {
          await cancelBookingAfterPaymentFailure(relatedId);
        } catch (cleanupError) {
          console.error('[PaymentModal] Échec cleanup booking après erreur paiement:', cleanupError);
        }
      }

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
        "Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer. Si le problème persiste, revenez en arrière puis relancez le paiement."
      );
    } finally {
      // Réactiver l'UI (handleClose est déjà appelé dans les branches try/catch)
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
    >
      <View style={styles.paymentMethodIcon}>{icon}</View>
      <Text style={styles.paymentMethodLabel}>{label}</Text>
    </TouchableOpacity>
  );

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
});

export default PaymentModal;
