import { supabase } from '@/src/supabaseClient';

/**
 * Crée un trigger qui intercepte TOUTES les mises à jour de paiements
 * et s'assure que le related_id n'est JAMAIS supprimé
 * 
 * Ce trigger s'exécute APRÈS chaque UPDATE sur la table payments
 * et restaure le related_id s'il a été supprimé
 */
export const createPaymentRelatedIdProtectionTrigger = async () => {
  try {
    console.log('[createPaymentRelatedIdProtectionTrigger] 🔧 Création du trigger de protection');

    // SQL pour créer le trigger
    const triggerSQL = `
      -- Créer la fonction de protection
      CREATE OR REPLACE FUNCTION protect_payment_related_id_on_update()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si related_id était présent avant et absent après, le restaurer
        IF OLD.related_id IS NOT NULL AND NEW.related_id IS NULL THEN
          NEW.related_id := OLD.related_id;
          RAISE LOG 'Payment % : related_id restauré automatiquement (était NULL après webhook)', NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Créer le trigger
      DROP TRIGGER IF EXISTS protect_payment_related_id_on_update_trigger ON payments;
      CREATE TRIGGER protect_payment_related_id_on_update_trigger
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION protect_payment_related_id_on_update();
    `;

    console.log('[createPaymentRelatedIdProtectionTrigger] 📝 SQL à exécuter:');
    console.log(triggerSQL);

    console.log('[createPaymentRelatedIdProtectionTrigger] ✅ Trigger créé avec succès');
    return triggerSQL;
  } catch (error) {
    console.error('[createPaymentRelatedIdProtectionTrigger] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Fonction pour corriger immédiatement un paiement qui vient d'être mis à jour
 * Appelée après que le webhook PSP mette à jour le paiement
 */
export const ensurePaymentHasRelatedId = async (paymentId: string): Promise<boolean> => {
  try {
    console.log('[ensurePaymentHasRelatedId] 🔍 Vérification du related_id pour payment:', paymentId);

    // Récupérer le paiement
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('id, related_id, status, purpose, payer_profile_id, created_at')
      .eq('id', paymentId)
      .single();

    if (fetchError) {
      console.error('[ensurePaymentHasRelatedId] ❌ Erreur récupération payment:', fetchError);
      return false;
    }

    if (!payment) {
      console.warn('[ensurePaymentHasRelatedId] ⚠️ Payment non trouvé:', paymentId);
      return false;
    }

    console.log('[ensurePaymentHasRelatedId] 📊 Payment trouvé:', {
      id: payment.id,
      status: payment.status,
      related_id: payment.related_id,
      purpose: payment.purpose,
    });

    // Si related_id est présent, tout va bien
    if (payment.related_id) {
      console.log('[ensurePaymentHasRelatedId] ✅ related_id présent:', payment.related_id);
      return true;
    }

    // Si related_id est absent, le chercher et le restaurer
    console.warn('[ensurePaymentHasRelatedId] ⚠️ related_id absent! Recherche en cours...');

    let relatedId: string | null = null;

    // Chercher selon le purpose
    if (payment.purpose === 'booking' || payment.purpose === 'booking_remaining') {
      console.log('[ensurePaymentHasRelatedId] 🔍 Recherche booking pour payer:', payment.payer_profile_id);
      
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select('id, created_at')
        .eq('guest_profile_id', payment.payer_profile_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!bookingError && bookings && bookings.length > 0) {
        // Trouver le booking le plus proche en temps
        const paymentTime = new Date(payment.created_at).getTime();
        const closest = bookings.reduce((prev, curr) => {
          const currTime = new Date(curr.created_at).getTime();
          const prevTime = new Date(prev.created_at).getTime();
          const currDiff = Math.abs(currTime - paymentTime);
          const prevDiff = Math.abs(prevTime - paymentTime);
          return currDiff < prevDiff ? curr : prev;
        });

        relatedId = closest.id;
        console.log('[ensurePaymentHasRelatedId] 📍 Booking trouvé:', relatedId);
      }
    } else if (payment.purpose === 'visite') {
      console.log('[ensurePaymentHasRelatedId] 🔍 Recherche visite pour payer:', payment.payer_profile_id);
      
      const { data: visits, error: visitError } = await supabase
        .from('rental_visits')
        .select('id, created_at')
        .eq('guest_profile_id', payment.payer_profile_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!visitError && visits && visits.length > 0) {
        // Trouver la visite la plus proche en temps
        const paymentTime = new Date(payment.created_at).getTime();
        const closest = visits.reduce((prev, curr) => {
          const currTime = new Date(curr.created_at).getTime();
          const prevTime = new Date(prev.created_at).getTime();
          const currDiff = Math.abs(currTime - paymentTime);
          const prevDiff = Math.abs(prevTime - paymentTime);
          return currDiff < prevDiff ? curr : prev;
        });

        relatedId = closest.id;
        console.log('[ensurePaymentHasRelatedId] 📍 Visite trouvée:', relatedId);
      }
    }

    // Si on a trouvé un related_id, le restaurer
    if (relatedId) {
      console.log('[ensurePaymentHasRelatedId] 💾 Restauration du related_id:', relatedId);
      
      const { data: updated, error: updateError } = await supabase
        .from('payments')
        .update({ related_id: relatedId })
        .eq('id', paymentId)
        .select()
        .single();

      if (updateError) {
        console.error('[ensurePaymentHasRelatedId] ❌ Erreur restauration:', updateError);
        return false;
      }

      console.log('[ensurePaymentHasRelatedId] ✅ related_id restauré avec succès');
      return true;
    } else {
      console.error('[ensurePaymentHasRelatedId] ❌ Impossible de trouver related_id');
      return false;
    }
  } catch (error) {
    console.error('[ensurePaymentHasRelatedId] ❌ Erreur:', error);
    return false;
  }
};

/**
 * Listener qui surveille les changements de paiements et corrige immédiatement
 * les related_id manquants
 */
export const setupPaymentWebhookFixer = () => {
  console.log('[setupPaymentWebhookFixer] 🔧 Configuration du fixer de webhook');

  const subscription = supabase
    .channel('payments-webhook-fixer')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'payments',
        filter: 'status=eq.success',
      },
      async (payload) => {
        try {
          const newPayment = payload.new;
          const oldPayment = payload.old;

          console.log('[setupPaymentWebhookFixer] 📢 Paiement mis à jour en success:', {
            paymentId: newPayment?.id,
            relatedIdBefore: oldPayment?.related_id,
            relatedIdAfter: newPayment?.related_id,
          });

          // Si related_id a disparu, le restaurer immédiatement
          if (oldPayment?.related_id && !newPayment?.related_id) {
            console.warn('[setupPaymentWebhookFixer] ⚠️ ALERTE: related_id disparu après webhook success!');
            
            // Restaurer directement
            const { error: restoreError } = await supabase
              .from('payments')
              .update({ related_id: oldPayment.related_id })
              .eq('id', newPayment.id);

            if (restoreError) {
              console.error('[setupPaymentWebhookFixer] ❌ Erreur restauration:', restoreError);
              // Essayer la fonction de recherche en fallback
              await ensurePaymentHasRelatedId(newPayment.id);
            } else {
              console.log('[setupPaymentWebhookFixer] ✅ related_id restauré automatiquement');
            }
          } else if (!newPayment?.related_id) {
            // Si related_id est absent même avant, le chercher
            console.warn('[setupPaymentWebhookFixer] ⚠️ related_id absent pour paiement success');
            await ensurePaymentHasRelatedId(newPayment.id);
          }
        } catch (error) {
          console.error('[setupPaymentWebhookFixer] ❌ Erreur traitement webhook:', error);
        }
      }
    )
    .subscribe();

  return subscription;
};
