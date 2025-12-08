import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface HostVerificationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<void>;
  isVerifying: boolean;
  phoneNumber: string;
  errorMessage?: string | null;
  codeLength?: number;
  onResend?: () => void | Promise<void>;
  isResending?: boolean;
  resendCooldown?: number;
}

export const HostVerificationModal: React.FC<HostVerificationModalProps> = ({
  isVisible,
  onClose,
  onVerify,
  isVerifying,
  phoneNumber,
  errorMessage,
  codeLength = 6,
  onResend,
  isResending = false,
  resendCooldown = 0,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const trimmedCode = verificationCode.trim();
  const effectiveLength = Math.max(codeLength, 4);
  const canSubmit = trimmedCode.length === effectiveLength;

  React.useEffect(() => {
    if (!isVisible) {
      setVerificationCode('');
    }
  }, [isVisible]);

  const handleVerify = async () => {
    if (!canSubmit || isVerifying) return;
    await onVerify(trimmedCode);
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Vérifiez votre numéro</Text>
            <TouchableOpacity onPress={onClose} disabled={isVerifying}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Nous avons envoyé un code sur WhatsApp au{'\n'}
            <Text style={styles.phone}>{phoneNumber}</Text>
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder={`Entrez le code à ${effectiveLength} chiffres`}
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={effectiveLength}
              editable={!isVerifying}
              autoFocus
            />
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {onResend ? (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                (isVerifying || isResending || resendCooldown > 0) && styles.secondaryButtonDisabled,
              ]}
              onPress={onResend}
              disabled={isVerifying || isResending || resendCooldown > 0}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  (isVerifying || isResending || resendCooldown > 0) && styles.secondaryButtonTextDisabled,
                ]}
              >
                {isResending
                  ? 'Renvoi en cours…'
                  : resendCooldown > 0
                    ? `Renvoyer dans ${resendCooldown}s`
                    : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.verifyButton, canSubmit && !isVerifying && styles.verifyButtonEnabled]}
            onPress={handleVerify}
            disabled={!canSubmit || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.verifyButtonText, canSubmit && !isVerifying && styles.verifyButtonTextEnabled]}>
                Vérifier
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendButton} onPress={onClose} disabled={isVerifying}>
            <Text style={styles.resendButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  phone: {
    fontWeight: '600',
    color: '#0F172A',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    fontFamily: 'Manrope',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#0F172A',
  },
  errorText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  verifyButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonEnabled: {
    backgroundColor: '#2ECC71',
  },
  verifyButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  verifyButtonTextEnabled: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  secondaryButtonTextDisabled: {
    color: '#6B7280',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
});
