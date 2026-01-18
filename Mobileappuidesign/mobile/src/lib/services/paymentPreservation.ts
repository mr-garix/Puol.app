import { supabase } from '@/src/supabaseClient';

/**
 * Préserve le related_id lors de la mise à jour d'un paiement
 * Utile quand le webhook PSP met à jour le paiement sans envoyer le related_id
 * 
 * Flux:
 * 1. Récupérer le paiement AVANT mise à jour pour extraire le related_id
 * 2. Mettre à jour le paiement avec les nouvelles données
 * 3. Si related_id était présent avant et absent après, le restaurer
 */
export const updatePaymentWithRelatedIdPreservation = async (
  paymentId: string,
  updateData: Record<string, any>
): Promise<any> => {
  try {
    console.log('[updatePaymentWithRelatedIdPreservation] 🔄 Mise à jour paiement avec préservation related_id');
    console.log('[updatePaymentWithRelatedIdPreservation] Payment ID:', paymentId);
    console.log('[updatePaymentWithRelatedIdPreservation] Données à mettre à jour:', updateData);

    // 1. Récupérer le paiement AVANT mise à jour
    const { data: paymentBefore, error: fetchError } = await supabase
      .from('payments')
      .select('id, related_id, status, purpose')
      .eq('id', paymentId)
      .single();

    if (fetchError) {
      console.error('[updatePaymentWithRelatedIdPreservation] ❌ Erreur récupération paiement avant:', fetchError);
      throw fetchError;
    }

    const relatedIdBefore = paymentBefore?.related_id;
    console.log('[updatePaymentWithRelatedIdPreservation] 📊 Paiement AVANT mise à jour:', {
      id: paymentBefore?.id,
      status: paymentBefore?.status,
      related_id: relatedIdBefore,
      purpose: paymentBefore?.purpose,
    });

    // 2. Mettre à jour le paiement
    const { data: paymentAfter, error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('[updatePaymentWithRelatedIdPreservation] ❌ Erreur mise à jour paiement:', updateError);
      throw updateError;
    }

    console.log('[updatePaymentWithRelatedIdPreservation] 📊 Paiement APRÈS mise à jour:', {
      id: paymentAfter?.id,
      status: paymentAfter?.status,
      related_id: paymentAfter?.related_id,
      purpose: paymentAfter?.purpose,
    });

    // 3. Vérifier si related_id a disparu et le restaurer si nécessaire
    if (relatedIdBefore && !paymentAfter?.related_id) {
      console.warn('[updatePaymentWithRelatedIdPreservation] ⚠️ related_id a disparu après mise à jour!');
      console.warn('[updatePaymentWithRelatedIdPreservation] Avant:', relatedIdBefore);
      console.warn('[updatePaymentWithRelatedIdPreservation] Après:', paymentAfter?.related_id);

      // Restaurer le related_id
      const { data: paymentRestored, error: restoreError } = await supabase
        .from('payments')
        .update({ related_id: relatedIdBefore })
        .eq('id', paymentId)
        .select()
        .single();

      if (restoreError) {
        console.error('[updatePaymentWithRelatedIdPreservation] ❌ Erreur restauration related_id:', restoreError);
        throw restoreError;
      }

      console.log('[updatePaymentWithRelatedIdPreservation] ✅ related_id restauré:', relatedIdBefore);
      return paymentRestored;
    }

    console.log('[updatePaymentWithRelatedIdPreservation] ✅ Mise à jour complète - related_id préservé');
    return paymentAfter;
  } catch (error) {
    console.error('[updatePaymentWithRelatedIdPreservation] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Crée un trigger côté app pour intercepter les mises à jour de paiements
 * et s'assurer que le related_id est toujours préservé
 */
export const setupPaymentPreservationListener = () => {
  console.log('[setupPaymentPreservationListener] 🔧 Configuration du listener de préservation related_id');

  // Écouter les changements de la table payments
  const subscription = supabase
    .channel('payments-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
      },
      async (payload) => {
        try {
          const newPayment = payload.new;
          const oldPayment = payload.old;

          console.log('[setupPaymentPreservationListener] 📢 Changement détecté:', {
            paymentId: newPayment?.id,
            statusBefore: oldPayment?.status,
            statusAfter: newPayment?.status,
            relatedIdBefore: oldPayment?.related_id,
            relatedIdAfter: newPayment?.related_id,
          });

          // Si related_id a disparu et que le paiement est en success
          if (
            oldPayment?.related_id &&
            !newPayment?.related_id &&
            newPayment?.status === 'success'
          ) {
            console.warn('[setupPaymentPreservationListener] ⚠️ ALERTE: related_id disparu pour paiement success!');
            console.warn('[setupPaymentPreservationListener] Payment ID:', newPayment?.id);
            console.warn('[setupPaymentPreservationListener] related_id avant:', oldPayment?.related_id);

            // Restaurer le related_id
            const { error: restoreError } = await supabase
              .from('payments')
              .update({ related_id: oldPayment.related_id })
              .eq('id', newPayment.id);

            if (restoreError) {
              console.error('[setupPaymentPreservationListener] ❌ Erreur restauration:', restoreError);
            } else {
              console.log('[setupPaymentPreservationListener] ✅ related_id restauré automatiquement');
            }
          }
        } catch (error) {
          console.error('[setupPaymentPreservationListener] ❌ Erreur traitement changement:', error);
        }
      }
    )
    .subscribe();

  return subscription;
};

/**
 * Vérifie tous les paiements success et restaure les related_id manquants
 */
export const repairAllPaymentsRelatedIds = async () => {
  try {
    console.log('[repairAllPaymentsRelatedIds] 🔧 Réparation de tous les paiements...');

    // Récupérer tous les paiements success sans related_id
    const { data: brokenPayments, error: fetchError } = await supabase
      .from('payments')
      .select('id, purpose, payer_profile_id, amount, created_at')
      .eq('status', 'success')
      .is('related_id', null);

    if (fetchError) {
      console.error('[repairAllPaymentsRelatedIds] ❌ Erreur récupération:', fetchError);
      return;
    }

    if (!brokenPayments || brokenPayments.length === 0) {
      console.log('[repairAllPaymentsRelatedIds] ✅ Aucun paiement à réparer');
      return;
    }

    console.log('[repairAllPaymentsRelatedIds] ⚠️ Trouvé', brokenPayments.length, 'paiements à réparer');

    let repaired = 0;
    let failed = 0;

    for (const payment of brokenPayments) {
      try {
        let relatedId: string | null = null;

        // Chercher le related_id selon le purpose
        if (payment.purpose === 'booking' || payment.purpose === 'booking_remaining') {
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('guest_profile_id', payment.payer_profile_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (bookings && bookings.length > 0) {
            relatedId = bookings[0].id;
          }
        } else if (payment.purpose === 'visite') {
          const { data: visits } = await supabase
            .from('rental_visits')
            .select('id')
            .eq('guest_profile_id', payment.payer_profile_id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (visits && visits.length > 0) {
            relatedId = visits[0].id;
          }
        }

        if (relatedId) {
          const { error: updateError } = await supabase
            .from('payments')
            .update({ related_id: relatedId })
            .eq('id', payment.id);

          if (updateError) {
            console.error('[repairAllPaymentsRelatedIds] ❌ Erreur réparation payment', payment.id);
            failed++;
          } else {
            console.log('[repairAllPaymentsRelatedIds] ✅ Payment', payment.id, 'réparé');
            repaired++;
          }
        } else {
          console.warn('[repairAllPaymentsRelatedIds] ⚠️ Impossible de trouver related_id pour', payment.id);
          failed++;
        }
      } catch (error) {
        console.error('[repairAllPaymentsRelatedIds] ❌ Erreur traitement payment:', error);
        failed++;
      }
    }

    console.log('[repairAllPaymentsRelatedIds] 📊 Résumé:', {
      total: brokenPayments.length,
      repaired,
      failed,
    });
  } catch (error) {
    console.error('[repairAllPaymentsRelatedIds] ❌ Erreur générale:', error);
  }
};
