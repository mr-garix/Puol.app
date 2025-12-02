// Placeholder pour VisitPaymentDialog
// À implémenter quand on développe la fonctionnalité visits

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const VisitPaymentDialog: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>VisitPaymentDialog - À implémenter</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
