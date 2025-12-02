import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export const HostPendingOverlay: React.FC = () => {
  return (
    <View style={styles.pendingOverlay}>
      <Feather name="clock" size={24} color="#92400E" />
      <Text style={styles.pendingTitle}>En attente de vérification</Text>
      <Text style={styles.pendingSubtitle}>
        Votre profil est en cours de validation par l’équipe PUOL. Vous recevrez une notification dès qu’il sera activé.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pendingOverlay: {
    marginTop: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
});
