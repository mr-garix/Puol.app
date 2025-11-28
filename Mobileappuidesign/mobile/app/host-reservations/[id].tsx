import React, { useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { HOST_RESERVATIONS } from '@/src/data/mockHostReservations';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
};

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function HostReservationDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const reservation = HOST_RESERVATIONS.find((item) => item.id === params.id);
  const [paymentState, setPaymentState] = useState<'idle' | 'pending' | 'received'>('idle');
  const [paymentToast, setPaymentToast] = useState<{ title: string; subtitle: string; tone: 'info' | 'success' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stayRange = useMemo(() => {
    if (!reservation) {
      return { checkIn: '', checkOut: '' };
    }
    return {
      checkIn: formatFullDate(reservation.checkIn),
      checkOut: formatFullDate(reservation.checkOut),
    };
  }, [reservation]);

  const stayNightsLabel = useMemo(() => {
    if (!reservation) {
      return '';
    }
    return `${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''}`;
  }, [reservation]);

  if (!reservation) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: COLORS.muted }}>Réservation introuvable.</Text>
      </SafeAreaView>
    );
  }

  const hasSplitPayout = reservation.payoutBreakdown.dueOnArrival > 0;
  const handleCancelPress = () => {
    Alert.alert(
      'Annuler cette réservation',
      "Vous êtes sur le point d'annuler. Contactez le support PUOL pour finaliser l'opération.",
      [
        { text: 'Fermer', style: 'cancel' },
        {
          text: 'Contacter le support',
          style: 'destructive',
          onPress: () => router.push('/support' as never),
        },
      ],
    );
  };

  const handleRequestPayment = () => {
    if (paymentState !== 'idle') {
      return;
    }
    setPaymentState('pending');
    showToast('Lien envoyé', 'Surveillez le paiement depuis vos versements.', 'info');
    if (paymentTimer.current) {
      clearTimeout(paymentTimer.current);
    }
    paymentTimer.current = setTimeout(() => {
      setPaymentState('received');
      showToast('Paiement reçu', 'Le reste du versement est confirmé.', 'success');
    }, 10000);
  };

  const showToast = (title: string, subtitle: string, tone: 'info' | 'success') => {
    setPaymentToast({ title, subtitle, tone });
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setPaymentToast(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      if (paymentTimer.current) {
        clearTimeout(paymentTimer.current);
      }
    };
  }, []);

  const paymentButtonIcon = paymentState === 'received' ? 'check-circle' : paymentState === 'pending' ? 'clock' : 'credit-card';
  const paymentButtonTitle = paymentState === 'pending' ? 'En attente du paiement' : paymentState === 'received' ? 'Paiement reçu' : 'Demander le reste du paiement';
  const paymentButtonSubtitle = paymentState === 'pending' ? 'Le voyageur vient de recevoir le lien' : paymentState === 'received' ? 'Le versement sera mis à jour automatiquement' : 'Prévenez le voyageur et envoyez le lien';
  const paymentButtonStyle = [
    styles.collectButton,
    paymentState === 'pending' && styles.collectButtonPending,
    paymentState === 'received' && styles.collectButtonReceived,
    paymentState !== 'idle' && { opacity: paymentState === 'received' ? 1 : 0.95 },
  ];

  const handleCallGuest = () => {
    if (!reservation?.guestPhone) {
      return;
    }
    const telUrl = `tel:${reservation.guestPhone.replace(/\s+/g, '')}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          Alert.alert('Appel impossible', 'Votre appareil ne peut pas lancer cet appel.');
        }
      })
      .catch(() => Alert.alert('Appel impossible', 'Veuillez composer le numéro manuellement.'));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 16) }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{reservation.propertyName}</Text>
            <Text style={styles.headerSubtitle}>Détails de la réservation</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.guestRow}>
            <Image
              source={{ uri: `https://i.pravatar.cc/160?u=${reservation.guestHandle}` }}
              style={styles.guestAvatar}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroGuest}>{reservation.guestName}</Text>
                  <Text style={styles.heroHandle}>{reservation.guestHandle}</Text>
                </View>
                <View style={styles.confirmBadge}>
                  <Feather name="check-circle" size={14} color={COLORS.accent} />
                  <Text style={styles.confirmBadgeText}>Confirmé</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.heroActionsRow, { gap: 12 }]}>
            <TouchableOpacity
              style={[styles.viewListingButton, { flex: 1 }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/property/${encodeURIComponent(reservation.propertyName)}` as never)}
            >
              <Text style={styles.viewListingText}>Voir l'annonce</Text>
              <Feather name="arrow-up-right" size={14} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.callButton} activeOpacity={0.85} onPress={handleCallGuest}>
              <Feather name="phone" size={14} color={COLORS.accent} />
              <Text style={styles.callButtonText}>{reservation.guestPhone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Résumé du séjour</Text>
          <InfoRow label="Arrivée" value={stayRange.checkIn} icon="log-in" />
          <InfoRow label="Départ" value={stayRange.checkOut} icon="log-out" />
          <InfoRow label="Voyageurs" value={`${reservation.guests} personne${reservation.guests > 1 ? 's' : ''}`} icon="users" />
          <InfoRow label="Durée du séjour" value={stayNightsLabel} icon="moon" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Paiement & versement</Text>
          <InfoRow label="Tarif par nuit" value={formatCurrency(reservation.nightlyRate)} icon="sunrise" />
          <InfoRow label="Montant total" value={formatCurrency(reservation.totalAmount)} icon="dollar-sign" highlight />
          <View style={styles.payoutRow}>
            <Badge icon="check-circle" label="Réglé en ligne" value={formatCurrency(reservation.payoutBreakdown.paidOnline)} accent />
            {hasSplitPayout && (
              <Badge icon="info" label="À l'arrivée" value={formatCurrency(reservation.payoutBreakdown.dueOnArrival)} />
            )}
          </View>
          {hasSplitPayout && (
            <>
              <View style={styles.ruleBanner}>
                <Feather name="alert-triangle" size={16} color="#92400E" />
                <Text style={styles.ruleBannerText}>
                  Séjour {'>'} 8 nuits : les 2 dernières nuits sont réglées sur place selon la règle PUOL.
                </Text>
              </View>
              <TouchableOpacity
                style={paymentButtonStyle}
                activeOpacity={0.9}
                onPress={handleRequestPayment}
                disabled={paymentState !== 'idle'}
              >
                <Feather name={paymentButtonIcon} size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.collectButtonTitle}>{paymentButtonTitle}</Text>
                  <Text style={styles.collectButtonSubtitle}>{paymentButtonSubtitle}</Text>
                </View>
              </TouchableOpacity>
              {paymentToast && (
                <View style={[styles.paymentToast, paymentToast.tone === 'success' && styles.paymentToastSuccess]}>
                  <Feather name={paymentToast.tone === 'success' ? 'check-circle' : 'info'} size={16} color={paymentToast.tone === 'success' ? '#047857' : '#065F46'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentToastTitle}>{paymentToast.title}</Text>
                    <Text style={styles.paymentToastSubtitle}>{paymentToast.subtitle}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.cancelButton} activeOpacity={0.85} onPress={handleCancelPress}>
            <Feather name="slash" size={16} color="#FFFFFF" />
            <Text style={styles.cancelButtonText}>Annuler la réservation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, icon, highlight }: { label: string; value: string; icon: React.ComponentProps<typeof Feather>['name']; highlight?: boolean }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Feather name={icon} size={14} color={COLORS.accent} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  </View>
);

const Badge = ({ icon, label, value, accent }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; accent?: boolean }) => (
  <View style={[styles.badge, accent && styles.badgeAccent]}>
    <Feather name={icon} size={12} color={accent ? '#166534' : COLORS.muted} />
    <Text style={[styles.badgeLabel, accent && styles.badgeLabelAccent]}>{label}</Text>
    <Text style={[styles.badgeValue, accent && styles.badgeValueAccent]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  heroGuest: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  heroHandle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  viewListingButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewListingText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  callButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.25)',
  },
  callButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  confirmBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stayText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  infoValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
  },
  infoValueHighlight: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  payoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeAccent: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: 'rgba(46,204,113,0.25)',
  },
  badgeLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  badgeLabelAccent: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  badgeValue: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  badgeValueAccent: {
    color: COLORS.accent,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(250,204,21,0.15)',
  },
  ruleBannerText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },
  collectButton: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collectButtonPending: {
    backgroundColor: '#F97316',
  },
  collectButtonReceived: {
    backgroundColor: '#059669',
  },
  collectButtonTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  collectButtonSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  paymentToast: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  paymentToastSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  paymentToastTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  paymentToastSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  footerActions: {
    marginTop: 8,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
