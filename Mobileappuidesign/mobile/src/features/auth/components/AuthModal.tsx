import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onLogin,
  onSignUp,
  message,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('@/assets/icons/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <Text style={styles.title}>Bienvenue</Text>

          <Text style={styles.message}>
            {message || 'Connectez-vous ou créez un compte pour continuer'}
          </Text>

          <TouchableOpacity style={styles.loginButton} onPress={onLogin} activeOpacity={0.8}>
            <Feather name="log-in" size={20} color="#FFFFFF" />
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupButton} onPress={onSignUp} activeOpacity={0.8}>
            <Feather name="user-plus" size={20} color="#2ECC71" />
            <Text style={styles.signupButtonText}>Créer un compte</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 32,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 64,
    height: 64,
    marginLeft: 4,
    marginTop: -1,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 30,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  loginIcon: {
    fontSize: 20,
  },
  loginButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signupButton: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(46, 204, 113, 0.05)',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  signupIcon: {
    fontSize: 20,
  },
  signupButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#2ECC71',
  },
  footerText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
