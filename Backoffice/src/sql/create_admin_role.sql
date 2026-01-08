-- Ajouter le rôle 'admin' à la table profiles
-- Cette migration ajoute la possibilité d'avoir des comptes admin dans le système

-- 1. Vérifier que la colonne 'role' accepte la valeur 'admin'
-- (La colonne 'role' devrait déjà accepter les valeurs: 'guest', 'host', 'landlord', 'admin')

-- 2. Créer un profil admin de test (remplacer par vos vraies données)
INSERT INTO profiles (
  id,
  phone,
  first_name,
  last_name,
  role,
  supply_role,
  is_certified,
  created_at,
  updated_at
) VALUES (
  '+237670844398',
  '+237670844398',
  'Admin',
  'BackOffice',
  'admin',
  'none',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_certified = true,
  updated_at = NOW();

-- 3. Créer une RLS policy pour les admins (accès complet)
-- Les admins peuvent voir et modifier toutes les données
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins - accès complet en lecture
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- Policy pour les admins - accès complet en modification
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- Policy pour les admins - accès complet en suppression
CREATE POLICY "Admins can delete all profiles" ON profiles
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- 4. Créer des policies pour les autres tables (listings, bookings, etc.)
-- Les admins auront accès complet à toutes les tables

-- Pour la table listings
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all listings" ON listings
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can update all listings" ON listings
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can delete all listings" ON listings
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- Pour la table bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can update all bookings" ON bookings
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can delete all bookings" ON bookings
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- Pour la table payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can update all payments" ON payments
  FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

CREATE POLICY "Admins can delete all payments" ON payments
  FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
  );

-- Note: Appliquer ces policies à toutes les autres tables critiques
-- (listing_conversations, listing_messages, listing_visits, etc.)
