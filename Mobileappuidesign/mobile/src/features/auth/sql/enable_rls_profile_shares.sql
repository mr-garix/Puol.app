-- ============================================================================
-- Row Level Security (RLS) for profile_shares table
-- ============================================================================
-- Shares are publicly visible (hosts peuvent voir qui a partagé), mais
-- seule la personne qui partage peut créer/modifier/supprimer son share.
-- ============================================================================

ALTER TABLE public.profile_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy 1: SELECT - lecture publique
-- ============================================================================
CREATE POLICY "Public can view profile shares"
  ON public.profile_shares
  FOR SELECT
  USING (TRUE);

-- ============================================================================
-- Policy 2: INSERT - l'utilisateur doit être l'auteur du partage
-- ============================================================================
CREATE POLICY "Users can create their own profile shares"
  ON public.profile_shares
  FOR INSERT
  WITH CHECK (
    shared_by_profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 3: UPDATE - l'utilisateur ne peut modifier que ses partages
-- ============================================================================
CREATE POLICY "Users can update their own profile shares"
  ON public.profile_shares
  FOR UPDATE
  USING (
    shared_by_profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  )
  WITH CHECK (
    shared_by_profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 4: DELETE - l'utilisateur ne supprime que ses partages
-- ============================================================================
CREATE POLICY "Users can delete their own profile shares"
  ON public.profile_shares
  FOR DELETE
  USING (
    shared_by_profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Vérifications
-- ============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profile_shares';
-- SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'profile_shares';
-- ============================================================================
