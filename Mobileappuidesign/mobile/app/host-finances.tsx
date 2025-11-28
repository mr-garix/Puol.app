import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TransactionStatus = 'versé' | 'en-attente';

type Transaction = {
  id: string;
  guest: string;
  listing: string;
  amount: number;
  date: string;
  status: TransactionStatus;
};

const filterOptions = ["Aujourd'hui", 'Cette semaine', 'Ce mois', '3 derniers mois'];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    guest: 'Mélissa D.',
    listing: 'Studio Bonamoussadi',
    amount: 42000,
    date: '2025-11-24T18:30:00Z',
    status: 'versé',
  },
  {
    id: 'tx-002',
    guest: 'Samuel K.',
    listing: 'Appartement Bali',
    amount: 68000,
    date: '2025-11-23T13:10:00Z',
    status: 'en-attente',
  },
  {
    id: 'tx-003',
    guest: 'Diane L.',
    listing: 'Résidence Makepe',
    amount: 55000,
    date: '2025-11-18T09:40:00Z',
    status: 'versé',
  },
  {
    id: 'tx-004',
    guest: 'Chantal P.',
    listing: 'Loft Akwa',
    amount: 72000,
    date: '2025-10-29T20:05:00Z',
    status: 'versé',
  },
];

const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

const formatTransactionDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const getDateRange = (filter: string, reference: Date) => {
  const todayStart = startOfDay(reference);
  const todayEnd = endOfDay(reference);

  if (filter === "Aujourd'hui") {
    return { start: todayStart, end: todayEnd };
  }

  if (filter === 'Cette semaine') {
    const day = reference.getDay();
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd };
  }

  if (filter === 'Ce mois') {
    const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: monthStart, end: monthEnd };
  }

  const quarterStart = new Date(reference.getFullYear(), reference.getMonth() - 2, 1);
  const quarterEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start: quarterStart, end: quarterEnd };
};

export default function HostFinancesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[2]);
  const [policyVisible, setPolicyVisible] = useState(false);
  const [currentDate] = useState(() => new Date());

  const filteredTransactions = useMemo(() => {
    const range = getDateRange(selectedFilter, currentDate);
    return MOCK_TRANSACTIONS.filter((transaction) => {
      const txDate = new Date(transaction.date);
      return txDate >= range.start && txDate <= range.end;
    });
  }, [selectedFilter, currentDate]);

  const summary = useMemo(() => {
    const monthRange = getDateRange('Ce mois', currentDate);
    const monthTransactions = MOCK_TRANSACTIONS.filter((transaction) => {
      const txDate = new Date(transaction.date);
      return txDate >= monthRange.start && txDate <= monthRange.end;
    });

    const totalMonth = monthTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const pendingAmount = monthTransactions
      .filter((tx) => tx.status === 'en-attente')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowLabel = capitalize(
      tomorrow.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
    );

    return {
      totalMonth,
      nextPayout: {
        amount: pendingAmount,
        label: `Demain · ${tomorrowLabel}`,
      },
    };
  }, [currentDate]);

  const handleBack = () => router.back();
  const handleSupportPress = () => router.push('/support' as never);
  const openPolicyModal = () => setPolicyVisible(true);
  const closePolicyModal = () => setPolicyVisible(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top - 40, 2) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.85}>
            <Feather name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recettes & versements</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryStack}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryBlockHeader}>
              <Text style={styles.summaryLabel}>Total encaissé ce mois</Text>
              <Text style={styles.summaryAmount} numberOfLines={1}>
                {formatCurrency(summary.totalMonth)}
              </Text>
            </View>
            <Text style={styles.summaryCaption}>Basé sur vos réservations confirmées</Text>
          </View>

          <View style={[styles.summaryBlock, styles.nextPayoutBlock]}>
            <Text style={styles.nextPayoutLabel}>Prochain virement</Text>
            <Text style={styles.nextPayoutValue}>{formatCurrency(summary.nextPayout.amount)}</Text>
            <Text style={styles.nextPayoutHint}>{summary.nextPayout.label}</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Période</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {filterOptions.map((option) => {
              const active = selectedFilter === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterPill, active && styles.filterPillActive]}
                  onPress={() => setSelectedFilter(option)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.transactionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <TouchableOpacity style={styles.downloadButton} activeOpacity={0.85}>
            <Feather name="download" size={16} color="#0F172A" />
            <Text style={styles.downloadLabel}>Télécharger le relevé</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionList}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTransactionsTitle}>Aucune transaction</Text>
              <Text style={styles.emptyTransactionsSubtitle}>
                {selectedFilter === "Aujourd'hui"
                  ? "Aucun encaissement enregistré aujourd’hui."
                  : 'Aucune transaction pour cette période.'}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[styles.transactionItem, index === filteredTransactions.length - 1 && styles.transactionItemLast]}
              >
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionAvatar}>
                    <Text style={styles.transactionAvatarLabel}>{transaction.guest.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.transactionGuest}>{transaction.guest}</Text>
                    <Text style={styles.transactionListing}>{transaction.listing}</Text>
                    <Text style={styles.transactionDate}>{formatTransactionDate(transaction.date)}</Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>+{transaction.amount.toLocaleString('fr-FR')} FCFA</Text>
                  <Text
                    style={[styles.transactionStatus, transaction.status === 'versé' ? styles.statusPaid : styles.statusPending]}
                  >
                    {transaction.status === 'versé' ? 'Versé' : 'Versement en attente'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.financeAction} activeOpacity={0.85} onPress={handleSupportPress}>
            <Feather name="message-circle" size={18} color="#059669" />
            <Text style={styles.financeActionText}>Contacter PUOL finance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.financeAction} activeOpacity={0.85} onPress={openPolicyModal}>
            <Feather name="info" size={18} color="#2563EB" />
            <Text style={styles.financeActionText}>Voir la politique de versement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={policyVisible} transparent animationType="fade" onRequestClose={closePolicyModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Politique de versement</Text>
            <Text style={styles.modalSubtitle}>
              Les détails de la politique de versement seront publiés très prochainement. Vous serez notifié dès sa
              disponibilité.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={closePolicyModal} activeOpacity={0.85}>
              <Text style={styles.modalButtonText}>Compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerWrapper: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 20,
  },
  summaryStack: {
    gap: 14,
  },
  summaryBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  summaryBlockHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryAmount: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryCaption: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
  },
  nextPayoutBlock: {
    backgroundColor: '#DCFCE7',
    borderColor: '#34D399',
  },
  nextPayoutLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  nextPayoutValue: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#065F46',
  },
  nextPayoutHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  filtersRow: {
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderColor: '#34D399',
  },
  filterText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#4B5563',
  },
  filterTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  downloadLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionItemLast: {
    borderBottomWidth: 0,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionAvatarLabel: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  transactionGuest: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  transactionListing: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  transactionDate: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },
  transactionStatus: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    textAlign: 'center',
  },
  statusPaid: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    color: '#92400E',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 12,
  },
  financeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  financeActionText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  emptyTransactions: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 6,
  },
  emptyTransactionsTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyTransactionsSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  modalButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
