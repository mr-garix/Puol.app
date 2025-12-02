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
}

export const HostVerificationModal: React.FC<HostVerificationModalProps> = ({
  isVisible,
  onClose,
  onVerify,
  isVerifying,
  phoneNumber,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const canSubmit = verificationCode.trim().length >= 4;

  const handleVerify = async () => {
    if (!canSubmit || isVerifying) return;
    await onVerify(verificationCode.trim());
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
            Nous avons envoyé un code par SMS au{'\n'}
            <Text style={styles.phone}>{phoneNumber}</Text>
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="Entrez le code à 4 chiffres"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={4}
              editable={!isVerifying}
              autoFocus
            />
          </View>

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
  resendButton: {
    alignItems: 'center',
  },
  resendButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
});
