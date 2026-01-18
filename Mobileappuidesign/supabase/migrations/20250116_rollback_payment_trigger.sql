-- Rollback: Supprimer le trigger de protection du related_id
-- Exécute ceci pour annuler la migration précédente

-- 1. Supprimer le trigger
DROP TRIGGER IF EXISTS protect_payment_related_id_trigger ON payments;

-- 2. Supprimer la fonction
DROP FUNCTION IF EXISTS protect_payment_related_id();

-- 3. Vérification
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger et fonction supprimés avec succès';
END $$;
