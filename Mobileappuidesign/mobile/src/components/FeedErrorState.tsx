import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const FeedErrorState: React.FC<FeedErrorStateProps> = ({ error, onRetry }) => {
  if (error) {
    console.warn('[FeedErrorState] Feed loading error:', error);
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="wifi-off" size={64} color="#9CA3AF" style={styles.icon} />

        <Text style={styles.title}>Impossible de charger le feed</Text>

        <Text style={styles.message}>
          Nous n’arrivons pas à afficher les annonces pour le moment. Vérifie que ta connexion est bien activée, puis
          appuie sur « Réessayer » pour relancer le chargement des annonces.
        </Text>

        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <MaterialCommunityIcons name="refresh" size={20} color="#041005" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    height: SCREEN_HEIGHT,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  icon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ECC71',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#041005',
  },
});
