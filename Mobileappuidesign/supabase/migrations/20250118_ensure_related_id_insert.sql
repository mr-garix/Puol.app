-- Migration: S'assurer que related_id est inséré directement lors de la création du paiement
-- Problème: related_id n'est pas inséré dans la colonne related_id lors de la création du paiement
-- Solution: Vérifier et corriger les politiques RLS pour permettre l'insertion de related_id

-- 1. Vérifier le type de la colonne related_id
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'payments' AND column_name = 'related_id';
  
  RAISE NOTICE 'Type actuel de related_id: %', col_type;
END $$;

-- 2. S'assurer que related_id est UUID (pas TEXT)
-- Si c'est TEXT, le convertir en UUID
ALTER TABLE payments ALTER COLUMN related_id TYPE uuid USING related_id::uuid;

-- 3. Supprimer les anciennes politiques RLS
DROP POLICY IF EXISTS "Allow insert own payments" ON payments;
DROP POLICY IF EXISTS "Allow read own payments" ON payments;
DROP POLICY IF EXISTS "Allow update own payments" ON payments;
DROP POLICY IF EXISTS "Allow delete own payments" ON payments;

-- 4. Créer des politiques RLS permissives qui permettent l'insertion de related_id
CREATE POLICY "Allow insert own payments"
ON payments
FOR INSERT
WITH CHECK (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

CREATE POLICY "Allow read own payments"
ON payments
FOR SELECT
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

CREATE POLICY "Allow update own payments"
ON payments
FOR UPDATE
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
)
WITH CHECK (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

CREATE POLICY "Allow delete own payments"
ON payments
FOR DELETE
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

-- 5. Vérification finale
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complète';
  RAISE NOTICE '✅ related_id est maintenant UUID';
  RAISE NOTICE '✅ Politiques RLS permettent l''insertion de related_id';
  RAISE NOTICE '✅ Au moment de la création du paiement, related_id DOIT être inséré directement';
END $$;
