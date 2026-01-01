import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';

type HostPayoutRow = Database['public']['Tables']['host_payouts']['Row'];

export interface HostPayout extends HostPayoutRow {}

/**
 * Récupère les payouts disponibles pour un hôte
 */
export const getHostPayouts = async (hostProfileId: string) => {
  try {
    const { data, error } = await supabase!
      .from('host_payouts')
      .select('*')
      .eq('host_profile_id', hostProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as HostPayout[];
  } catch (error) {
    console.error('[getHostPayouts] Erreur:', error);
    throw error;
  }
};

/**
 * Calcule le montant total disponible pour un hôte
 */
export const getTotalAvailablePayout = async (hostProfileId: string) => {
  try {
    const { data, error } = await supabase!
      .from('host_payouts')
      .select('amount')
      .eq('host_profile_id', hostProfileId)
      .eq('status', 'available');

    if (error) throw error;

    const total = (data || []).reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
    return total;
  } catch (error) {
    console.error('[getTotalAvailablePayout] Erreur:', error);
    throw error;
  }
};

/**
 * Effectue un paiement pour un hôte
 */
export const processHostPayout = async (params: {
  hostProfileId: string;
  method: 'orange_money' | 'mtn_momo' | 'bank_transfer';
  reference: string;
  phoneNumber?: string;
}) => {
  try {
    const { hostProfileId, method, reference } = params;

    // Mettre à jour les payouts en attente (pending) à 'paid'
    const { data, error } = await supabase!
      .from('host_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payout_method: method,
        payout_reference: reference,
        processed_at: new Date().toISOString(),
      })
      .eq('host_profile_id', hostProfileId)
      .eq('status', 'pending')
      .select();

    if (error) throw error;

    console.log('[processHostPayout] Payout effectué:', data);
    return data;
  } catch (error) {
    console.error('[processHostPayout] Erreur:', error);
    throw error;
  }
};
