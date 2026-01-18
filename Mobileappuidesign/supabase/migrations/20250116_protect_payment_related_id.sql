-- Migration: Protéger le related_id dans la table payments
-- Objectif: S'assurer que le related_id n'est JAMAIS NULL après validation du paiement
-- Cela corrige le bug où le webhook PSP supprime le related_id lors de la mise à jour

-- 1. Créer la fonction de protection du related_id
-- Cette fonction s'exécute AVANT chaque UPDATE et restaure le related_id s'il a été supprimé
CREATE OR REPLACE FUNCTION protect_payment_related_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si related_id était présent avant et absent après, le restaurer
  IF OLD.related_id IS NOT NULL AND NEW.related_id IS NULL THEN
    NEW.related_id := OLD.related_id;
    RAISE LOG 'Payment % : related_id restauré automatiquement (était NULL après update)', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Créer le trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS protect_payment_related_id_trigger ON payments;
CREATE TRIGGER protect_payment_related_id_trigger
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION protect_payment_related_id();

-- 3. Corriger les paiements existants qui ont perdu leur related_id
-- Pour les bookings: chercher le booking correspondant par guest_profile_id et timestamp
UPDATE payments p
SET related_id = (
  SELECT b.id FROM bookings b
  WHERE p.payer_profile_id = b.guest_profile_id
    AND p.purpose IN ('booking', 'booking_remaining')
    AND ABS(EXTRACT(EPOCH FROM (b.created_at - p.created_at))) < 3600
  ORDER BY ABS(EXTRACT(EPOCH FROM (b.created_at - p.created_at)))
  LIMIT 1
)
WHERE p.status = 'success'
  AND p.related_id IS NULL
  AND p.purpose IN ('booking', 'booking_remaining');

-- Pour les visites: chercher la visite correspondante par guest_profile_id et timestamp
UPDATE payments p
SET related_id = (
  SELECT v.id FROM rental_visits v
  WHERE p.payer_profile_id = v.guest_profile_id
    AND p.purpose = 'visite'
    AND ABS(EXTRACT(EPOCH FROM (v.created_at - p.created_at))) < 3600
  ORDER BY ABS(EXTRACT(EPOCH FROM (v.created_at - p.created_at)))
  LIMIT 1
)
WHERE p.status = 'success'
  AND p.related_id IS NULL
  AND p.purpose = 'visite';

-- 4. Vérifier les corrections
DO $$
DECLARE
  fixed_count INT;
  total_success INT;
BEGIN
  SELECT COUNT(*) INTO total_success FROM payments WHERE status = 'success';
  SELECT COUNT(*) INTO fixed_count FROM payments WHERE status = 'success' AND related_id IS NULL;
  
  RAISE NOTICE 'Paiements success: % total, % sans related_id', total_success, fixed_count;
  
  IF fixed_count > 0 THEN
    RAISE WARNING 'ATTENTION: % paiements success ont toujours related_id NULL', fixed_count;
  ELSE
    RAISE NOTICE '✅ Tous les paiements success ont un related_id';
  END IF;
END $$;
