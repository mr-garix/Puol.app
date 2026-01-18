-- Migration: Corriger les politiques RLS pour permettre l'écriture du related_id
-- Problème: Le related_id n'est pas sauvegardé lors de l'insertion du paiement
-- Cause: Politique RLS trop restrictive qui empêche l'écriture de ce champ

-- 1. Supprimer toutes les politiques RLS existantes sur payments
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can read their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON payments;

-- 2. Désactiver RLS temporairement pour corriger les données
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- 3. Réactiver RLS avec des politiques permissives
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Créer une politique permissive pour les insertions
-- Permettre à l'utilisateur authentifié d'insérer ses propres paiements
CREATE POLICY "Allow insert own payments"
ON payments
FOR INSERT
WITH CHECK (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

-- 5. Créer une politique pour les lectures
CREATE POLICY "Allow read own payments"
ON payments
FOR SELECT
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

-- 6. Créer une politique pour les mises à jour
CREATE POLICY "Allow update own payments"
ON payments
FOR UPDATE
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
)
WITH CHECK (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

-- 7. Créer une politique pour les suppressions
CREATE POLICY "Allow delete own payments"
ON payments
FOR DELETE
USING (
  auth.uid()::text = payer_profile_id OR auth.role() = 'service_role'
);

-- 8. S'assurer que la colonne related_id existe et est nullable
-- Si elle n'existe pas, l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN related_id TEXT;
    RAISE NOTICE 'Colonne related_id ajoutée';
  ELSE
    -- S'assurer qu'elle est nullable
    ALTER TABLE payments ALTER COLUMN related_id DROP NOT NULL;
    RAISE NOTICE 'Colonne related_id existe déjà et est nullable';
  END IF;
END $$;

-- 9. Log de vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS mises à jour pour permettre related_id';
  RAISE NOTICE '✅ Colonne related_id vérifiée et nullable';
END $$;
