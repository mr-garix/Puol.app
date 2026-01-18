import { supabase } from '@/src/supabaseClient';

/**
 * Corrige les paiements qui ont perdu leur related_id après validation
 * Cette fonction récupère le related_id depuis la table bookings/visits
 * et le restaure dans la table payments
 */
export const fixMissingRelatedIds = async () => {
  try {
    console.log('[fixMissingRelatedIds] 🔧 Vérification des paiements sans related_id...');

    // Récupérer tous les paiements avec status 'success' mais sans related_id
    const { data: paymentsWithoutRelatedId, error: fetchError } = await supabase
      .from('payments')
      .select('id, purpose, payer_profile_id, amount, provider_reference')
      .eq('status', 'success')
      .is('related_id', null);

    if (fetchError) {
      console.error('[fixMissingRelatedIds] ❌ Erreur récupération paiements:', fetchError);
      return;
    }

    if (!paymentsWithoutRelatedId || paymentsWithoutRelatedId.length === 0) {
      console.log('[fixMissingRelatedIds] ✅ Aucun paiement sans related_id');
      return;
    }

    console.log('[fixMissingRelatedIds] ⚠️ Trouvé', paymentsWithoutRelatedId.length, 'paiements sans related_id');

    // Pour chaque paiement, chercher le related_id correspondant
    for (const payment of paymentsWithoutRelatedId) {
      let relatedId: string | null = null;

      // Chercher dans les bookings si c'est un paiement de booking
      if (payment.purpose === 'booking' || payment.purpose === 'booking_remaining') {
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id')
          .eq('guest_profile_id', payment.payer_profile_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!bookingError && bookings && bookings.length > 0) {
          relatedId = bookings[0].id;
          console.log('[fixMissingRelatedIds] 📍 Trouvé booking:', relatedId);
        }
      }

      // Chercher dans les visits si c'est un paiement de visite
      if (payment.purpose === 'visite' && !relatedId) {
        const { data: visits, error: visitError } = await supabase
          .from('rental_visits')
          .select('id')
          .eq('guest_profile_id', payment.payer_profile_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!visitError && visits && visits.length > 0) {
          relatedId = visits[0].id;
          console.log('[fixMissingRelatedIds] 📍 Trouvé visit:', relatedId);
        }
      }

      // Si on a trouvé un related_id, le restaurer
      if (relatedId) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({ related_id: relatedId })
          .eq('id', payment.id);

        if (updateError) {
          console.error('[fixMissingRelatedIds] ❌ Erreur mise à jour payment', payment.id, ':', updateError);
        } else {
          console.log('[fixMissingRelatedIds] ✅ Payment', payment.id, 'restauré avec related_id:', relatedId);
        }
      } else {
        console.warn('[fixMissingRelatedIds] ⚠️ Impossible de trouver related_id pour payment:', payment.id);
      }
    }

    console.log('[fixMissingRelatedIds] ✅ Correction terminée');
  } catch (error) {
    console.error('[fixMissingRelatedIds] ❌ Erreur:', error);
  }
};

/**
 * Vérifie qu'un paiement a bien son related_id après validation
 */
export const verifyPaymentRelatedId = async (paymentId: string): Promise<string | null> => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, related_id, status, purpose')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('[verifyPaymentRelatedId] ❌ Erreur:', error);
      return null;
    }

    if (!payment) {
      console.warn('[verifyPaymentRelatedId] ⚠️ Payment non trouvé:', paymentId);
      return null;
    }

    console.log('[verifyPaymentRelatedId] 📊 Payment:', {
      id: payment.id,
      status: payment.status,
      related_id: payment.related_id,
      purpose: payment.purpose,
    });

    if (!payment.related_id) {
      console.warn('[verifyPaymentRelatedId] ⚠️ Payment sans related_id:', paymentId);
    }

    return payment.related_id;
  } catch (error) {
    console.error('[verifyPaymentRelatedId] ❌ Erreur:', error);
    return null;
  }
};
