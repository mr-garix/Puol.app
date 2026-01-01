import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';

type TransactionStatus = 'versé' | 'en-attente';

type Transaction = {
  id: string;
  guest: string;
  listing: string;
  amount: number;
  date: string;
  status: TransactionStatus;
  checkInDate?: string;
  checkOutDate?: string;
};

const filterOptions = ["Aujourd'hui", 'Cette semaine', 'Ce mois', '3 derniers mois'];

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
  const isAndroid = Platform.OS === 'android';
  const { supabaseProfile } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState(filterOptions[2]);
  const [policyVisible, setPolicyVisible] = useState(false);
  const currentDate = new Date();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [availableForPayout, setAvailableForPayout] = useState(0);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [activeDateField, setActiveDateField] = useState<'start' | 'end'>('start');
  const [dateFilter, setDateFilter] = useState<'all' | 'custom'>('all');

  // Récupérer les earnings depuis Supabase avec les données du client et du listing
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!supabaseProfile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Récupérer TOUS les host_payouts (pending et paid)
        const { data: allPayoutData, error: allPayoutError } = await supabase
          .from('host_payouts')
          .select('*')
          .eq('host_profile_id', supabaseProfile.id)
          .order('created_at', { ascending: false });

        if (allPayoutError) {
          console.warn('[HostFinances] Erreur lors de la récupération des payouts:', allPayoutError);
        }
        
        console.log('[HostFinances] Tous les payouts récupérés:', allPayoutData);
        
        // Récupérer SEULEMENT les payouts pending pour le montant disponible
        const pendingPayouts = (allPayoutData || []).filter((p: any) => p.status === 'pending');
        const totalAvailable = pendingPayouts.reduce((sum: number, payout: any) => sum + (payout.total_amount || 0), 0);
        setAvailableForPayout(totalAvailable);

        const { data, error } = await supabase
          .from('host_earnings')
          .select('*')
          .eq('host_profile_id', supabaseProfile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Créer une map des payouts par montant ET date pour vérifier le statut de chaque earning
        // On utilise un Map avec clé composite (montant + date arrondie au jour)
        const payoutStatusMap = new Map<string, string>();
        (allPayoutData || []).forEach((p: any) => {
          const payoutDate = new Date(p.created_at).toISOString().split('T')[0];
          const key = `${p.total_amount}_${payoutDate}`;
          payoutStatusMap.set(key, p.status);
        });

        // Récupérer les détails des bookings en utilisant related_id
        const relatedIds = (data || []).map((earning: any) => earning.related_id).filter(Boolean);
        
        let bookingsData: any[] = [];
        if (relatedIds.length > 0) {
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .in('id', relatedIds);

          if (bookingsError) throw bookingsError;
          bookingsData = bookings || [];
        }

        // Récupérer les profils des guests
        const guestIds = bookingsData.map((b: any) => b.guest_profile_id).filter(Boolean);
        let profilesData: any[] = [];
        if (guestIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', guestIds);

          if (profilesError) throw profilesError;
          profilesData = profiles || [];
        }

        // Récupérer les listings
        const listingIds = bookingsData.map((b: any) => b.listing_id).filter(Boolean);
        let listingsData: any[] = [];
        if (listingIds.length > 0) {
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('id, title')
            .in('id', listingIds);

          if (listingsError) throw listingsError;
          listingsData = listings || [];
        }

        // Créer des maps pour les lookups
        const bookingsMap = new Map(bookingsData.map((b: any) => [b.id, b]));
        const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]));
        const listingsMap = new Map(listingsData.map((l: any) => [l.id, l]));

        // Transformer les données en transactions
        const transformedTransactions: Transaction[] = (data || []).map((earning: any) => {
          const booking = bookingsMap.get(earning.related_id);
          const guestProfile = profilesMap.get(booking?.guest_profile_id);
          const listing = listingsMap.get(booking?.listing_id);
          const guestName = guestProfile 
            ? `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() 
            : 'Client PUOL';

          // Vérifier le statut du payout correspondant avec clé composite
          const earningDate = new Date(earning.created_at).toISOString().split('T')[0];
          const payoutKey = `${earning.host_amount}_${earningDate}`;
          const payoutStatus = payoutStatusMap.get(payoutKey);
          const transactionStatus = payoutStatus === 'paid' ? 'versé' : 'en-attente';

          return {
            id: earning.id,
            guest: guestName,
            listing: listing?.title || 'Réservation',
            amount: earning.host_amount || 0,
            date: earning.created_at,
            status: transactionStatus as TransactionStatus,
            checkInDate: booking?.checkin_date,
            checkOutDate: booking?.checkout_date,
          };
        });

        setTransactions(transformedTransactions);
      } catch (error) {
        console.error('[HostFinances] Erreur lors de la récupération des earnings:', error);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
  }, [supabaseProfile?.id]);

  // Subscription Realtime pour les mises à jour des payouts
  useEffect(() => {
    if (!supabaseProfile?.id) {
      return;
    }

    console.log('[HostFinances] Setting up realtime subscription for payouts');
    
    const channel = supabase
      .channel(`host-payouts-${supabaseProfile.id}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'host_payouts',
          filter: `host_profile_id=eq.${supabaseProfile.id}`,
        },
        async (payload: any) => {
          console.log('[HostFinances] Payout changed:', payload);
          
          // Rafraîchir les données quand un payout change
          if (payload.eventType === 'UPDATE') {
            // Recharger les payouts et transactions
            try {
              const { data: payoutData } = await supabase
                .from('host_payouts')
                .select('*')
                .eq('host_profile_id', supabaseProfile.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

              // Calculer le nouveau montant disponible
              const totalAvailable = (payoutData || []).reduce((sum: number, payout: any) => sum + (payout.total_amount || 0), 0);
              setAvailableForPayout(totalAvailable);

              // Mettre à jour les transactions avec le nouveau statut
              setTransactions((prev) => {
                const payoutStatusMap = new Map<string, string>();
                (payoutData || []).forEach((p: any) => {
                  const payoutDate = new Date(p.created_at).toISOString().split('T')[0];
                  const key = `${p.total_amount}_${payoutDate}`;
                  payoutStatusMap.set(key, p.status);
                });

                return prev.map((tx) => {
                  const txDate = new Date(tx.date).toISOString().split('T')[0];
                  const txKey = `${tx.amount}_${txDate}`;
                  const payoutStatus = payoutStatusMap.get(txKey);
                  const newStatus = payoutStatus === 'paid' ? 'versé' : 'en-attente';
                  return {
                    ...tx,
                    status: newStatus as TransactionStatus,
                  };
                });
              });
            } catch (error) {
              console.error('[HostFinances] Erreur lors de la mise à jour des payouts:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[HostFinances] Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile?.id]);

  const openDatePicker = () => {
    setTempStartDate(customDateRange.start ?? new Date());
    setTempEndDate(customDateRange.end ?? new Date());
    setActiveDateField('start');
    setIsDatePickerVisible(true);
  };

  const applyCustomDateRange = () => {
    if (tempEndDate.getTime() < tempStartDate.getTime()) {
      setTempEndDate(tempStartDate);
    }
    setCustomDateRange({ start: tempStartDate, end: tempEndDate });
    setDateFilter('custom');
    setIsDatePickerVisible(false);
  };

  const resetDateFilter = () => {
    setCustomDateRange({ start: null, end: null });
    setDateFilter('all');
    setIsDatePickerVisible(false);
  };

  const filteredTransactions = useMemo(() => {
    const range = getDateRange(selectedFilter, currentDate);
    return transactions.filter((transaction: Transaction) => {
      const txDate = new Date(transaction.date);
      // Comparer en UTC pour éviter les problèmes de fuseau horaire
      const txDateUTC = new Date(txDate.getUTCFullYear(), txDate.getUTCMonth(), txDate.getUTCDate());
      const rangeStartUTC = new Date(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate());
      const rangeEndUTC = new Date(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate(), 23, 59, 59, 999);
      return txDateUTC >= rangeStartUTC && txDateUTC <= rangeEndUTC;
    });
  }, [selectedFilter, currentDate, transactions]);

  const summary = useMemo(() => {
    // Déterminer la plage de dates à utiliser
    let dateRange;
    if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
      // Utiliser la plage personnalisée
      dateRange = { start: customDateRange.start, end: customDateRange.end };
    } else {
      // Utiliser le filtre sélectionné (par défaut "Ce mois" qui correspond à 30 derniers jours)
      dateRange = getDateRange(selectedFilter, currentDate);
    }

    // Calculer le total chiffre d'affaires basé sur la plage de dates
    const filteredTransactions = transactions.filter((transaction: Transaction) => {
      const txDate = new Date(transaction.date);
      // Comparer en UTC pour éviter les problèmes de fuseau horaire
      const txDateUTC = new Date(txDate.getUTCFullYear(), txDate.getUTCMonth(), txDate.getUTCDate());
      const rangeStartUTC = new Date(dateRange.start.getUTCFullYear(), dateRange.start.getUTCMonth(), dateRange.start.getUTCDate());
      const rangeEndUTC = new Date(dateRange.end.getUTCFullYear(), dateRange.end.getUTCMonth(), dateRange.end.getUTCDate(), 23, 59, 59, 999);
      return txDateUTC >= rangeStartUTC && txDateUTC <= rangeEndUTC;
    });

    const totalRevenue = filteredTransactions.reduce((sum: number, tx: Transaction) => sum + tx.amount, 0);

    // Déterminer le label de la plage de dates
    let dateRangeLabel = '';
    if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
      const startDate = customDateRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const endDate = customDateRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      dateRangeLabel = `${startDate} - ${endDate}`;
    } else {
      dateRangeLabel = selectedFilter;
    }

    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowLabel = tomorrowDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return {
      totalRevenue,
      dateRangeLabel,
      nextPayout: {
        amount: availableForPayout,
        label: `Prochain virement ${tomorrowLabel}`,
      },
    };
  }, [currentDate, transactions, availableForPayout, selectedFilter, dateFilter, customDateRange]);

  const handleBack = () => router.back();
  const handleSupportPress = () => router.push('/support' as never);
  const openPolicyModal = () => setPolicyVisible(true);
  const closePolicyModal = () => setPolicyVisible(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 40, 2),
          },
          isAndroid && styles.headerWrapperAndroid,
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backButton, isAndroid && styles.backButtonAndroid]}
            onPress={handleBack}
            activeOpacity={0.85}
          >
            <Feather name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isAndroid && styles.headerTitleAndroid]}>Recettes & versements</Text>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dateFilterRow}>
          <Text style={styles.sectionTitle}>Filtrer par date personnalisée</Text>
          <TouchableOpacity
            style={[styles.filterPill, dateFilter !== 'all' && styles.filterPillActive]}
            onPress={openDatePicker}
            activeOpacity={0.8}
          >
            <Feather
              name="calendar"
              size={14}
              color={dateFilter !== 'all' ? '#1F2937' : '#6B7280'}
            />
            <Text style={[styles.filterText, dateFilter !== 'all' && styles.filterTextActive]}>
              {dateFilter === 'custom' && customDateRange.start && customDateRange.end
                ? `${customDateRange.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${customDateRange.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                : 'Sélectionner une plage de dates'}
            </Text>
          </TouchableOpacity>
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

        <View style={styles.summaryStack}>
          <View style={styles.summaryBlock}>
            <View style={styles.summaryBlockHeader}>
              <Text style={styles.summaryLabel}>Total chiffre d'affaires</Text>
              <Text style={styles.summaryAmount} numberOfLines={1}>
                {formatCurrency(summary.totalRevenue)}
              </Text>
            </View>
            <Text style={styles.summaryCaption}>{summary.dateRangeLabel}</Text>
          </View>

          <View style={[styles.summaryBlock, styles.nextPayoutBlock]}>
            <Text style={styles.nextPayoutLabel}>Disponible pour retrait</Text>
            <Text style={styles.nextPayoutValue}>{formatCurrency(summary.nextPayout.amount)}</Text>
            <Text style={styles.nextPayoutHint}>Prochain virement {summary.nextPayout.label}</Text>
          </View>
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
            filteredTransactions.map((transaction: Transaction, index: number) => (
              <View
                key={transaction.id}
                style={[styles.transactionItem, index === filteredTransactions.length - 1 && styles.transactionItemLast]}
              >
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionAvatar}>
                    <Text style={styles.transactionAvatarLabel}>{transaction.guest.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transactionGuest} numberOfLines={1}>{transaction.guest}</Text>
                    <Text style={styles.transactionListing} numberOfLines={1}>{transaction.listing}</Text>
                    {transaction.checkInDate && transaction.checkOutDate ? (
                      <Text style={styles.transactionDate}>
                        {formatTransactionDate(transaction.checkInDate)} → {formatTransactionDate(transaction.checkOutDate)}
                      </Text>
                    ) : (
                      <Text style={styles.transactionDate}>{formatTransactionDate(transaction.date)}</Text>
                    )}
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

      <Modal visible={isDatePickerVisible} transparent animationType="fade" onRequestClose={() => setIsDatePickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsDatePickerVisible(false)}>
          <View style={styles.modalContentDark}>
            <Text style={styles.modalSectionTitleDark}>Filtrer par date</Text>

            <View style={styles.modalFieldToggle}>
              {[
                { label: 'Date de début', value: 'start' as const },
                { label: 'Date de fin', value: 'end' as const },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.modalFieldToggleButton,
                    activeDateField === option.value && styles.modalFieldToggleButtonActive,
                  ]}
                  onPress={() => setActiveDateField(option.value)}
                >
                  <Text
                    style={[
                      styles.modalFieldToggleText,
                      activeDateField === option.value && styles.modalFieldToggleTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSelectionSummary}>
              <View style={styles.modalSelectionRow}>
                <Text style={styles.modalSelectionLabel}>Début</Text>
                <Text style={styles.modalSelectionValue}>
                  {tempStartDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.modalSelectionRow}>
                <Text style={styles.modalSelectionLabel}>Fin</Text>
                <Text style={styles.modalSelectionValue}>
                  {tempEndDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            </View>

            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={activeDateField === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                minimumDate={activeDateField === 'end' ? tempStartDate : undefined}
                themeVariant="light"
                style={styles.inlineDatePicker}
                onChange={(event: any, date: any) => {
                  if (!date) return;
                  if (activeDateField === 'start') {
                    setTempStartDate(date);
                    if (date.getTime() > tempEndDate.getTime()) {
                      setTempEndDate(date);
                    }
                  } else {
                    setTempEndDate(date);
                  }
                }}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalActionSecondary} onPress={resetDateFilter}>
                <Text style={styles.modalActionSecondaryText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalActionPrimary} onPress={applyCustomDateRange}>
                <Text style={styles.modalActionPrimaryText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

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
  headerWrapperAndroid: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
  backButtonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTitleAndroid: {
    flex: 1,
    fontSize: 18,
    marginLeft: 4,
  },
  headerSpacerAndroid: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 20,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterPillActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderColor: '#34D399',
  },
  filterText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#111827',
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentDark: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  modalSectionTitleDark: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalFieldToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  modalFieldToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalFieldToggleButtonActive: {
    backgroundColor: '#2ECC71',
  },
  modalFieldToggleText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalFieldToggleTextActive: {
    color: '#FFFFFF',
  },
  modalSelectionSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  modalSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalSelectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  modalSelectionValue: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  datePickerWrapper: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  inlineDatePicker: {
    width: '100%',
    maxWidth: 280,
    height: 300,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  modalActionSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalActionSecondaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  modalActionPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
  },
  modalActionPrimaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
