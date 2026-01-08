-- ============================================================================
-- Row Level Security (RLS) for profile_follows table
-- ============================================================================
-- Ensures that each user can manage only the follow relationships that involve them
-- (either as follower or as the profile being followed, depending on the action).
-- ============================================================================

-- Enable RLS on the profile_follows table
ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

-- Helper expression: we need to consider both phone formats
-- (with '+' prefix or without) for compatibility with legacy data.

-- ============================================================================
-- Policy 1: SELECT - Everyone can view follow relations (public read)
-- ============================================================================
CREATE POLICY "Users can view their follow relations"
  ON public.profile_follows
  FOR SELECT
  USING (
    -- Follow relationships are publicly visible (needed for follower counts)
    TRUE
  );

-- ============================================================================
-- Policy 2: INSERT - Users can create follows where they are the follower
-- ============================================================================
CREATE POLICY "Users can create their own follow relations"
  ON public.profile_follows
  FOR INSERT
  WITH CHECK (
    follower_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 3: UPDATE - Users can update follows they own (as follower)
-- ============================================================================
CREATE POLICY "Users can update their own follow relations"
  ON public.profile_follows
  FOR UPDATE
  USING (
    follower_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  )
  WITH CHECK (
    follower_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 4: DELETE - Users can delete follows they own (as follower)
-- ============================================================================
CREATE POLICY "Users can delete their own follow relations"
  ON public.profile_follows
  FOR DELETE
  USING (
    follower_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Verification queries
-- ============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profile_follows';
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'profile_follows';
-- ============================================================================
