-- Migration: Alimenter automatiquement host_earnings et host_payouts quand un paiement est validé
-- Objectif: Quand un paiement passe en success, créer automatiquement les lignes dans host_earnings et host_payouts

-- 1. Créer la fonction qui alimente host_earnings et host_payouts
CREATE OR REPLACE FUNCTION populate_host_earnings_on_payment_success()
RETURNS TRIGGER AS $$
DECLARE
  v_host_profile_id TEXT;
  v_host_amount NUMERIC;
  v_platform_fee NUMERIC;
  v_customer_amount NUMERIC;
  v_payout_id UUID;
  v_customer_price NUMERIC;
BEGIN
  -- Vérifier que le paiement est en success et a un related_id
  IF NEW.status = 'success' AND NEW.related_id IS NOT NULL THEN
    
    -- Récupérer le host_profile_id en fonction du purpose et related_id
    IF NEW.purpose = 'booking' OR NEW.purpose = 'booking_remaining' THEN
      -- Pour les bookings: récupérer le host via listings
      SELECT l.host_id INTO v_host_profile_id
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = NEW.related_id
      LIMIT 1;
      
    ELSIF NEW.purpose = 'visite' THEN
      -- Pour les visites: récupérer le host via rental_visits
      SELECT host_profile_id INTO v_host_profile_id
      FROM rental_visits
      WHERE id = NEW.related_id
      LIMIT 1;
    END IF;
    
    -- Si on a trouvé un host, créer les earnings
    IF v_host_profile_id IS NOT NULL THEN
      
      -- Récupérer le customerPrice du client_payload si disponible
      v_customer_price := COALESCE(
        (NEW.client_payload->>'customerPrice')::NUMERIC,
        NEW.amount
      );
      
      -- Calculer les montants
      IF NEW.purpose = 'visite' THEN
        -- Pour les visites: 100% pour la plateforme
        v_customer_amount := NEW.amount;
        v_platform_fee := NEW.amount;
        v_host_amount := 0;
      ELSE
        -- Pour les bookings: 90% pour le host, 10% pour la plateforme
        v_customer_amount := v_customer_price;
        v_host_amount := ROUND(v_customer_price / 1.1);
        v_platform_fee := v_customer_price - v_host_amount;
      END IF;
      
      -- Vérifier si un earning existe déjà pour ce paiement
      IF NOT EXISTS (SELECT 1 FROM host_earnings WHERE payment_id = NEW.id) THEN
        
        -- Créer la ligne host_earnings
        INSERT INTO host_earnings (
          host_profile_id,
          payment_id,
          purpose,
          related_id,
          customer_amount,
          platform_fee,
          host_amount,
          currency,
          status,
          available_at
        ) VALUES (
          v_host_profile_id,
          NEW.id,
          NEW.purpose,
          NEW.related_id,
          v_customer_amount,
          v_platform_fee,
          v_host_amount,
          NEW.currency,
          'available',
          NOW()
        );
        
        -- Créer ou mettre à jour host_payouts si host_amount > 0
        IF v_host_amount > 0 THEN
          -- Vérifier si un payout existe déjà pour ce host
          SELECT id INTO v_payout_id
          FROM host_payouts
          WHERE host_profile_id = v_host_profile_id
            AND status = 'pending'
            AND period_end IS NULL
          LIMIT 1;
          
          IF v_payout_id IS NULL THEN
            -- Créer un nouveau payout
            INSERT INTO host_payouts (
              host_profile_id,
              total_amount,
              currency,
              status,
              payout_method,
              period_start
            ) VALUES (
              v_host_profile_id,
              v_host_amount,
              NEW.currency,
              'pending',
              'bank_transfer',
              NOW()
            );
          ELSE
            -- Mettre à jour le payout existant
            UPDATE host_payouts
            SET total_amount = total_amount + v_host_amount
            WHERE id = v_payout_id;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Créer le trigger qui s'exécute après INSERT ou UPDATE
DROP TRIGGER IF EXISTS trigger_populate_host_earnings ON payments;

CREATE TRIGGER trigger_populate_host_earnings
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION populate_host_earnings_on_payment_success();

-- 3. Vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction et trigger créés avec succès';
  RAISE NOTICE '📋 La fonction alimente automatiquement host_earnings et host_payouts quand un paiement passe en success';
END $$;
