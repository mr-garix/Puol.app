-- Créer la table visitor_activity_heartbeat pour tracker les visiteurs anonymes
CREATE TABLE IF NOT EXISTS public.visitor_activity_heartbeat (
  visitor_id TEXT PRIMARY KEY,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  platform TEXT,
  app_version TEXT,
  city TEXT,
  linked_user_id TEXT,
  merged_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_visitor_activity_heartbeat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER visitor_activity_heartbeat_updated_at_trigger
BEFORE UPDATE ON public.visitor_activity_heartbeat
FOR EACH ROW
EXECUTE FUNCTION update_visitor_activity_heartbeat_updated_at();

-- Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_visitor_activity_heartbeat_last_activity_at 
ON public.visitor_activity_heartbeat(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_activity_heartbeat_linked_user_id 
ON public.visitor_activity_heartbeat(linked_user_id) 
WHERE linked_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_activity_heartbeat_merged_at 
ON public.visitor_activity_heartbeat(merged_at) 
WHERE merged_at IS NULL;

-- Activer RLS (Row Level Security) pour la sécurité
ALTER TABLE public.visitor_activity_heartbeat ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre à l'app Expo d'insérer/mettre à jour ses propres données
CREATE POLICY "Allow anon to insert and update visitor heartbeat"
ON public.visitor_activity_heartbeat
FOR ALL
USING (true)
WITH CHECK (true);
