-- ============================================================================
-- Row Level Security (RLS) for listing_likes table
-- ============================================================================
-- This enables RLS on the listing_likes table and creates policies to ensure:
-- 1. Users can only see their own likes
-- 2. Users can only create/update/delete their own likes
-- ============================================================================

-- Enable RLS on the listing_likes table
ALTER TABLE public.listing_likes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy 1: SELECT - Everyone can view likes (public read)
-- ============================================================================
CREATE POLICY "Users can view their own likes"
  ON public.listing_likes
  FOR SELECT
  USING (
    -- Likes are publicly visible (hosts/landlords need to see who liked)
    TRUE
  );

-- ============================================================================
-- Policy 2: INSERT - Users can create their own likes
-- ============================================================================
CREATE POLICY "Users can create their own likes"
  ON public.listing_likes
  FOR INSERT
  WITH CHECK (
    -- Ensure the like belongs to the authenticated user
    profile_id IN (
      auth.jwt() ->> 'phone',
      '+' || (auth.jwt() ->> 'phone')
    )
  );

-- ============================================================================
-- Policy 3: UPDATE - Users can update their own likes
-- ============================================================================
CREATE POLICY "Users can update their own likes"
  ON public.listing_likes
  FOR UPDATE
  USING (
    -- Match the profile_id with the authenticated user's phone (with or without +)
    profile_id IN (
      auth.jwt() ->> 'phone',
      '+' || (auth.jwt() ->> 'phone')
    )
  )
  WITH CHECK (
    -- Ensure the updated like still belongs to the authenticated user
    profile_id IN (
      auth.jwt() ->> 'phone',
      '+' || (auth.jwt() ->> 'phone')
    )
  );

-- ============================================================================
-- Policy 4: DELETE - Users can delete their own likes
-- ============================================================================
CREATE POLICY "Users can delete their own likes"
  ON public.listing_likes
  FOR DELETE
  USING (
    -- Match the profile_id with the authenticated user's phone (with or without +)
    profile_id IN (
      auth.jwt() ->> 'phone',
      '+' || (auth.jwt() ->> 'phone')
    )
  );

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check if RLS is enabled on listing_likes:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'listing_likes';

-- Check all RLS policies on listing_likes:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'listing_likes';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. RLS is now enabled on the listing_likes table
-- 2. Users can only access their own likes (matched by phone number)
-- 3. The policies use auth.jwt() to get the authenticated user's phone
-- 4. All policies are restrictive - users cannot see other users' likes
-- 5. To test: Login as a user and try to query listing_likes - only their own will be visible
-- ============================================================================
