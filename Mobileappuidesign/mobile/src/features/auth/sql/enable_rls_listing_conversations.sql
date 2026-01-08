-- ============================================================================
-- Row Level Security (RLS) for listing_conversations table
-- ============================================================================
-- Rules summary:
-- 1. SELECT  : Only participants (guest/host) can read a conversation
-- 2. INSERT  : User can create a conversation only if they are the guest or host in the payload
-- 3. UPDATE  : Only participants (guest/host) can update metadata/status for their conversation
-- 4. DELETE  : Restricted to service_role (optional cleanup)
-- ============================================================================

ALTER TABLE public.listing_conversations ENABLE ROW LEVEL SECURITY;

-- Convenience predicates (inline) reuse both phone formats (with + / without)
-- phone_without_plus := auth.jwt() ->> 'phone'
-- phone_with_plus    := '+' || (auth.jwt() ->> 'phone')

-- ============================================================================
-- Policy 1: SELECT - participants can view their conversation
-- ============================================================================
CREATE POLICY "Participants can view listing conversations"
  ON public.listing_conversations
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND (
        guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
        OR host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
      )
    )
  );

-- ============================================================================
-- Policy 2: INSERT - participants can create their own conversation rows
-- ============================================================================
CREATE POLICY "Participants can insert listing conversations"
  ON public.listing_conversations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND (
        guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
        OR host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
      )
    )
  );

-- ============================================================================
-- Policy 3: UPDATE - participants can update their conversation metadata
-- ============================================================================
CREATE POLICY "Participants can update listing conversations"
  ON public.listing_conversations
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND (
        guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
        OR host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND (
        guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
        OR host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
      )
    )
  );

-- ============================================================================
-- Policy 4: DELETE - restricted to service_role (cleanup / admin tasks)
-- ============================================================================
CREATE POLICY "Service role can delete listing conversations"
  ON public.listing_conversations
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Verification helpers
-- ============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'listing_conversations';
-- SELECT policyname, permissive, roles, qual, with_check
--   FROM pg_policies WHERE tablename = 'listing_conversations';
-- ============================================================================
