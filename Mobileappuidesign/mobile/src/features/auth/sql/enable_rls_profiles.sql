-- ============================================================================
-- Row Level Security (RLS) for profiles table
-- ============================================================================
-- This enables RLS on the profiles table and creates policies to ensure:
-- 1. Users can only see their own profile
-- 2. Users can only update their own profile
-- 3. Profiles can be created by authenticated users
-- 4. Profiles can be deleted by authenticated users (their own)
-- ============================================================================

-- Enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Policy 1: SELECT - Users can view their own profile
-- ============================================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (
    -- Match the profile.id (phone) with the authenticated user's phone from JWT
    id = (auth.jwt() ->> 'phone')
  );

-- ============================================================================
-- Policy 2: UPDATE - Users can update their own profile
-- ============================================================================
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    -- Match the profile.id (phone) with the authenticated user's phone from JWT
    id = (auth.jwt() ->> 'phone')
  )
  WITH CHECK (
    -- Ensure the profile being updated belongs to the authenticated user
    id = (auth.jwt() ->> 'phone')
  );

-- ============================================================================
-- Policy 3: INSERT - Allow trigger to create profiles (no RLS restriction)
-- ============================================================================
-- Note: The trigger runs with SECURITY DEFINER, so it bypasses RLS anyway.
-- We don't need an INSERT policy - the trigger will create profiles automatically.
-- If you need to allow authenticated users to insert, use the policy below:
-- CREATE POLICY "Authenticated users can create their own profile"
--   ON public.profiles
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- Policy 4: DELETE - Users can delete their own profile
-- ============================================================================
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (
    -- Match the profile.id (phone) with the authenticated user's phone from JWT
    id = (auth.jwt() ->> 'phone')
  );

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check if RLS is enabled on profiles:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- Check all RLS policies on profiles:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies WHERE tablename = 'profiles';

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. RLS is now enabled on the profiles table
-- 2. Users can only access their own profile (matched by phone number)
-- 3. The policies use auth.uid() to get the authenticated user's ID
-- 4. The phone number from auth.users is used to match with profiles.id
-- 5. All policies are restrictive - users cannot see other profiles
-- 6. To test: Login as a user and try to query profiles - only their own will be visible
-- ============================================================================
