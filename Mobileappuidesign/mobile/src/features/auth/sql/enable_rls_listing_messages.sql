-- ============================================================================
-- Row Level Security (RLS) for listing_messages table
-- ============================================================================
-- Rules summary:
-- 1. SELECT  : Only participants (guest/host) of the conversation OR service_role can read messages
-- 2. INSERT  : Authenticated user can send a message only if they are the sender AND belong to the conversation
-- 3. UPDATE  : Only the original sender (or service_role) can update a message
-- 4. DELETE  : Only the original sender (or service_role) can delete a message
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.listing_messages ENABLE ROW LEVEL SECURITY;

-- Helper expression (inline): we compare against both phone formats (with/without '+').
-- raw_phone := auth.jwt() ->> 'phone'
-- plus_phone := '+' || (auth.jwt() ->> 'phone')

-- Convenience predicate reused in multiple policies:
--   EXISTS (
--     SELECT 1
--     FROM public.listing_conversations lc
--     WHERE lc.id = listing_messages.conversation_id
--       AND (
--         lc.guest_profile_id IN (raw_phone, plus_phone)
--         OR lc.host_profile_id IN (raw_phone, plus_phone)
--       )
--   )

-- ============================================================================
-- Policy 1: SELECT (participants only, or service_role)
-- ============================================================================
CREATE POLICY "Participants can view listing messages"
  ON public.listing_messages
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.listing_conversations lc
        WHERE lc.id = listing_messages.conversation_id
          AND (
            lc.guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
            OR lc.host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
          )
      )
    )
  );

-- ============================================================================
-- Policy 2: INSERT (user must be sender AND belong to conversation)
-- ============================================================================
CREATE POLICY "Participants can insert their own listing messages"
  ON public.listing_messages
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND sender_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
      AND EXISTS (
        SELECT 1
        FROM public.listing_conversations lc
        WHERE lc.id = listing_messages.conversation_id
          AND (
            lc.guest_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
            OR lc.host_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
          )
      )
    )
  );

-- ============================================================================
-- Policy 3: UPDATE (only message owner, or service_role)
-- ============================================================================
CREATE POLICY "Senders can update their listing messages"
  ON public.listing_messages
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND sender_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND sender_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
    )
  );

-- ============================================================================
-- Policy 4: DELETE (only message owner, or service_role)
-- ============================================================================
CREATE POLICY "Senders can delete their listing messages"
  ON public.listing_messages
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR (
      (auth.jwt() ->> 'phone') IS NOT NULL
      AND sender_profile_id IN ((auth.jwt() ->> 'phone'), ('+' || (auth.jwt() ->> 'phone')))
    )
  );

-- ============================================================================
-- Verification queries (optional)
-- ============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'listing_messages';
-- SELECT policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'listing_messages';
-- ============================================================================
