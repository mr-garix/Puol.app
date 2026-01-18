-- Fix related_id: revenir en TEXT, nettoyer les valeurs vides, recréer le trigger compatible
-- À exécuter sur la base Supabase

-- 1) Revenir la colonne en TEXT (UUID stocké en chaîne)
ALTER TABLE payments ALTER COLUMN related_id TYPE text USING related_id::text;

-- 2) Nettoyer les valeurs vides
UPDATE payments
SET related_id = NULL
WHERE related_id IS NOT NULL AND trim(related_id) = '';

-- 3) Empêcher les chaînes vides à l'avenir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_related_id_not_blank'
  ) THEN
    ALTER TABLE payments
    ADD CONSTRAINT payments_related_id_not_blank
    CHECK (related_id IS NULL OR length(trim(related_id)) > 0);
  END IF;
END $$;

-- 4) Recréer la fonction trigger compatible TEXT (casts explicites)
DROP TRIGGER IF EXISTS trigger_populate_host_earnings ON payments;
DROP FUNCTION IF EXISTS populate_host_earnings_on_payment_success();

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
  IF NEW.status = 'success' AND NEW.related_id IS NOT NULL THEN
    -- Résoudre l'UUID à partir de related_id TEXT
    IF NEW.purpose = 'booking' OR NEW.purpose = 'booking_remaining' THEN
      SELECT l.host_id INTO v_host_profile_id
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = NEW.related_id::uuid
      LIMIT 1;
    ELSIF NEW.purpose = 'visite' THEN
      SELECT host_profile_id INTO v_host_profile_id
      FROM rental_visits rv
      WHERE rv.id = NEW.related_id::uuid
      LIMIT 1;
    END IF;

    IF v_host_profile_id IS NOT NULL THEN
      v_customer_price := COALESCE((NEW.client_payload->>'customerPrice')::NUMERIC, NEW.amount);

      IF NEW.purpose = 'visite' THEN
        v_customer_amount := NEW.amount;
        v_platform_fee := NEW.amount;
        v_host_amount := 0;
      ELSE
        v_customer_amount := v_customer_price;
        v_host_amount := ROUND(v_customer_price / 1.1);
        v_platform_fee := v_customer_price - v_host_amount;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM host_earnings WHERE payment_id = NEW.id) THEN
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

        IF v_host_amount > 0 THEN
          SELECT id INTO v_payout_id
          FROM host_payouts
          WHERE host_profile_id = v_host_profile_id
            AND status = 'pending'
            AND period_end IS NULL
          LIMIT 1;

          IF v_payout_id IS NULL THEN
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

CREATE TRIGGER trigger_populate_host_earnings
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION populate_host_earnings_on_payment_success();
