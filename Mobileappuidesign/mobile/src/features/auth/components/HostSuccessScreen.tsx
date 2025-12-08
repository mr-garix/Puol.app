import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';

interface HostSuccessScreenProps {
  onClose: () => void;
}

export const HostSuccessScreen: React.FC<HostSuccessScreenProps> = ({ onClose }) => {
  const router = useRouter();

  const handleGoToDashboard = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HOST_APPLICATION_COMPLETED, 'true');
    } catch (error) {
      console.warn('[HostSuccessScreen] Unable to persist host completion flag', error);
    } finally {
      router.replace('/(tabs)/profile' as never);
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="check" size={48} color="#2ECC71" />
      </View>
      <Text style={styles.title}>Demande envoyée !</Text>
      <Text style={styles.subtitle}>
        Votre demande pour devenir hôte PUOL a bien été envoyée. Nous allons examiner votre dossier et nous vous
        contacterons immédiatement sur WhatsApp.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleGoToDashboard}>
        <Text style={styles.buttonText}>Accéder à mon tableau de bord</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
