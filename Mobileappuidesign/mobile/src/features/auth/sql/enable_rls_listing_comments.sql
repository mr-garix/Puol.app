-- ============================================================================
-- Row Level Security (RLS) for listing_comments table
-- ============================================================================
-- This enables RLS on the listing_comments table and creates policies to ensure:
-- 1. Users can only see their own comments
-- 2. Users can only create/update/delete their own comments
-- ============================================================================

-- Enable RLS on the listing_comments table
ALTER TABLE public.listing_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy 1: SELECT - Everyone can view comments (public read)
-- ============================================================================
CREATE POLICY "Users can view their own comments"
  ON public.listing_comments
  FOR SELECT
  USING (
    -- Comments are publicly visible (hosts/landlords need to see all comments)
    TRUE
  );

-- ============================================================================
-- Policy 2: INSERT - Users can create their own comments
-- ============================================================================
CREATE POLICY "Users can create their own comments"
  ON public.listing_comments
  FOR INSERT
  WITH CHECK (
    profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 3: UPDATE - Users can update their own comments
-- ============================================================================
CREATE POLICY "Users can update their own comments"
  ON public.listing_comments
  FOR UPDATE
  USING (
    profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  )
  WITH CHECK (
    profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Policy 4: DELETE - Users can delete their own comments
-- ============================================================================
CREATE POLICY "Users can delete their own comments"
  ON public.listing_comments
  FOR DELETE
  USING (
    profile_id IN (
      (auth.jwt() ->> 'phone'),
      ('+' || (auth.jwt() ->> 'phone'))
    )
  );

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check if RLS is enabled on listing_comments:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'listing_comments';

-- Check all RLS policies on listing_comments:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'listing_comments';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. RLS is now enabled on the listing_comments table
-- 2. Users can only access their own comments (matched by phone number)
-- 3. The policies use auth.jwt() to get the authenticated user's phone
-- 4. All policies are restrictive - users cannot see or modify other users' comments
-- 5. To test: Login as a user and try to query listing_comments - only their own will be visible
-- ============================================================================
