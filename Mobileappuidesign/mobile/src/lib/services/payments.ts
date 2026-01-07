import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

type Payment = Database['public']['Tables']['payments']['Row'];
type HostEarning = Database['public']['Tables']['host_earnings']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
type HostEarningInsert = Database['public']['Tables']['host_earnings']['Insert'];
type HostPayoutInsert = Database['public']['Tables']['host_payouts']['Insert'];

// Configuration des frais
const VISIT_AMOUNT = 5000; // FCFA
const PLATFORM_FEE_PERCENT = 0.10; // 10%

/**
 * Calcule les montants pour une réservation
 * @param customerPrice - Prix payé par le client (prix affiché = prix host + 10%)
 * @returns Montant total, frais plateforme, montant pour le host
 */
export const calculateReservationAmounts = (customerPrice: number) => {
  // Le prix original du host = prix affiché / 1.1
  const hostOriginalPrice = Math.round(customerPrice / 1.1);
  // La commission = différence entre prix affiché et prix original
  const platformFee = customerPrice - hostOriginalPrice;
  // Le host reçoit son prix original
  const hostAmount = hostOriginalPrice;
  
  return {
    totalAmount: customerPrice, // Ce que le client paie
    platformFee, // Ta commission (fixe = 10% du prix original)
    hostAmount, // Ce que le host reçoit (son prix original)
  };
};

/**
 * Formate les montants pour l'affichage
 * @param hostPrice - Prix fixé par le host
 * @returns Objet formaté pour l'UI
 */
export const formatReservationPrice = (hostPrice: number) => {
  const { totalAmount, platformFee } = calculateReservationAmounts(hostPrice);
  
  return {
    hostPrice: hostPrice.toLocaleString() + ' FCFA',
    platformFee: platformFee.toLocaleString() + ' FCFA',
    totalAmount: totalAmount.toLocaleString() + ' FCFA',
    platformFeePercent: '10%',
    breakdown: `Prix host: ${hostPrice.toLocaleString()} FCFA\nCommission (10%): ${platformFee.toLocaleString()} FCFA\nTotal: ${totalAmount.toLocaleString()} FCFA`
  };
};

/**
 * Crée un paiement et les earnings associés
 * @param params - Paramètres du paiement
 */
export const createPaymentAndEarning = async (params: {
  payerProfileId: string;
  hostProfileId: string;
  purpose: 'visit' | 'booking';
  relatedId?: string;
  provider: 'orange_money' | 'mtn_momo' | 'card';
  customerPrice?: number; // Prix payé par le client (pour les réservations)
}) => {
  const { payerProfileId, hostProfileId, purpose, relatedId, provider, customerPrice } = params;
  
  // Calcul des montants selon le type
  let amount: number;
  let platformFee: number;
  let hostAmount: number;
  
  if (purpose === 'visit') {
    amount = VISIT_AMOUNT;
    platformFee = VISIT_AMOUNT; // 100% pour toi
    hostAmount = 0;
  } else if (purpose === 'booking' && customerPrice) {
    const amounts = calculateReservationAmounts(customerPrice);
    amount = amounts.totalAmount; // Ce que le client paie (prix affiché)
    platformFee = amounts.platformFee; // Tes 10%
    hostAmount = amounts.hostAmount; // 90% pour le host
  } else {
    throw new Error('Paramètres invalides : customerPrice requis pour les réservations');
  }
  
  try {
    console.log('[createPaymentAndEarning] 🔵 ===== DÉBUT DU PAIEMENT =====');
    console.log('[createPaymentAndEarning] 📥 Paramètres reçus:', { 
      purpose, 
      payerProfileId, 
      hostProfileId, 
      relatedId,
      customerPrice,
      amount,
      platformFee,
      hostAmount 
    });
    console.log('[createPaymentAndEarning] 🔍 relatedId type:', typeof relatedId, 'value:', relatedId);
    
    // 1. Créer le paiement
    const paymentPayload: PaymentInsert = {
      payer_profile_id: payerProfileId,
      purpose,
      related_id: relatedId || null,
      amount,
      currency: 'XAF',
      provider,
      provider_reference: null, // Pas de référence réelle en V1
      status: 'success', // V1 : on considère le paiement comme réussi
      paid_at: new Date().toISOString(),
    };
    console.log('[createPaymentAndEarning] 💳 Payment payload avant insert:', paymentPayload);
    console.log('[createPaymentAndEarning] 🔗 related_id dans payload:', paymentPayload.related_id);

    console.log('[createPaymentAndEarning] 📤 Insertion du paiement dans Supabase...');
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select()
      .single();
    
    if (paymentError) {
      console.error('[createPaymentAndEarning] ❌ Erreur paiement:', {
        error: paymentError,
        code: paymentError?.code,
        message: paymentError?.message,
        details: paymentError?.details,
      });
      throw paymentError;
    }
    
    console.log('[createPaymentAndEarning] ✅ ===== PAIEMENT CRÉÉ =====');
    console.log('[createPaymentAndEarning] 💾 Paiement data complète:', {
      id: payment?.id,
      payer_profile_id: payment?.payer_profile_id,
      purpose: payment?.purpose,
      related_id: payment?.related_id,
      amount: payment?.amount,
      status: payment?.status,
      created_at: payment?.created_at,
    });
    console.log('[createPaymentAndEarning] 🔗 related_id dans paiement créé:', payment?.related_id);
    
    // 2. Créer les earnings associés uniquement si le host a un montant > 0
    let earning: HostEarningInsert | null = null;
    let payout: any = null;
    
    if (hostAmount > 0) {
      const earningPayload = {
        host_profile_id: hostProfileId,
        payment_id: payment.id,
        purpose,
        related_id: relatedId || null,
        customer_amount: amount,
        platform_fee: platformFee,
        host_amount: hostAmount,
        currency: 'XAF',
        status: 'available',
        available_at: new Date().toISOString(),
        paid_at: null,
      } as HostEarningInsert;
      console.log('[createPaymentAndEarning] 💰 Earning payload avant insert:', earningPayload);
      console.log('[createPaymentAndEarning] 🔗 related_id dans earning payload:', earningPayload.related_id);
      
      console.log('[createPaymentAndEarning] 📤 Insertion du earning dans Supabase...');
      const { data, error: earningError } = await supabase
        .from('host_earnings')
        .insert(earningPayload)
        .select()
        .single();
      
      if (earningError) {
        console.error('[createPaymentAndEarning] ❌ Erreur earning:', {
          error: earningError,
          code: earningError?.code,
          message: earningError?.message,
          details: earningError?.details,
        });
        throw earningError;
      }
      
      earning = data ?? null;
      console.log('[createPaymentAndEarning] ✅ ===== EARNING CRÉÉ =====');
      console.log('[createPaymentAndEarning] 💾 Earning data complète:', {
        id: earning?.id,
        host_profile_id: earning?.host_profile_id,
        payment_id: earning?.payment_id,
        purpose: earning?.purpose,
        related_id: earning?.related_id,
        host_amount: earning?.host_amount,
        created_at: earning?.created_at,
      });
      console.log('[createPaymentAndEarning] 🔗 related_id dans earning créé:', earning?.related_id);
      
      // 3. Créer l'entrée dans host_payout pour rendre le montant disponible pour retrait
      const payoutPayload = {
        host_profile_id: hostProfileId,
        total_amount: hostAmount,
        currency: 'XAF',
        status: 'pending',
        payout_method: 'bank_transfer', // Valeur par défaut, sera mis à jour par le Backoffice
        payout_reference: null,
        period_start: new Date().toISOString(),
        period_end: null,
        // paid_at et processed_at sont gérés par les defaults de Supabase
      };
      
      const { data: payoutData, error: payoutError } = await supabase
        .from('host_payouts')
        .insert(payoutPayload as any)
        .select()
        .single();
      
      if (payoutError) {
        console.error('[createPaymentAndEarning] Erreur payout:', payoutError);
        throw payoutError;
      }
      
      payout = payoutData ?? null;
      console.log('[createPaymentAndEarning] Payout créé:', payout);
    } else {
      console.log('[createPaymentAndEarning] ℹ️ Pas de host_amount, aucun earning créé (visit)');
    }
    
    console.log('[createPaymentAndEarning] 🎉 ===== PAIEMENT COMPLET =====');
    console.log('[createPaymentAndEarning] 📊 Résumé final:', {
      paymentId: payment?.id,
      paymentRelatedId: payment?.related_id,
      earningId: earning?.id,
      earningRelatedId: earning?.related_id,
      payoutId: payout?.id,
    });
    
    return {
      payment,
      earning,
      payout,
    };
    
  } catch (error) {
    console.error('[createPaymentAndEarning] ❌ Erreur générale:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Récupère les earnings d'un host
 */
export const getHostEarnings = async (hostProfileId: string) => {
  try {
    const { data, error } = await supabase
      .from('host_earnings')
      .select('*')
      .eq('host_profile_id', hostProfileId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des earnings:', error);
    throw error;
  }
};

/**
 * Récupère les paiements d'un utilisateur
 */
export const getUserPayments = async (payerProfileId: string) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payer_profile_id', payerProfileId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    throw error;
  }
};
