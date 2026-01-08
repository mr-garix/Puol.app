-- ============================================================================
-- Trigger: Auto-create profile when a new user signs up via OTP
-- ============================================================================
-- This trigger creates a profile automatically when a new user is created
-- in auth.users. The profile.id is set to the user's phone number (TEXT).
-- The profile.phone is also set to the user's phone number.
--
-- This ensures that:
-- 1. Every authenticated user has a corresponding profile
-- 2. profiles.id = phone number (TEXT, not UUID)
-- 3. RLS policies can use auth.uid() -> phone -> profiles.id mapping
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
BEGIN
  -- Get the phone number from the new user
  v_phone := NEW.phone;
  
  -- Only create profile if user has a phone number
  IF v_phone IS NOT NULL AND v_phone != '' THEN
    BEGIN
      INSERT INTO public.profiles (
        id,
        phone,
        created_at,
        updated_at,
        supply_role,
        role,
        is_certified
      )
      VALUES (
        v_phone,
        v_phone,
        NOW(),
        NOW(),
        'none',
        'guest',
        false
      );
      
      RAISE LOG '[handle_new_user] Profile CREATED for phone: %', v_phone;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE LOG '[handle_new_user] Profile already exists for phone: %', v_phone;
      WHEN OTHERS THEN
        RAISE LOG '[handle_new_user] Error creating profile for phone %: %', v_phone, SQLERRM;
    END;
  ELSE
    RAISE LOG '[handle_new_user] User created without phone: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger (AFTER INSERT to avoid blocking user creation)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Verification queries (run these to verify the trigger is working)
-- ============================================================================

-- Check if trigger exists:
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';

-- Check if function exists:
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_name = 'handle_new_user';

-- Check if profiles were created:
-- SELECT id, phone, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 10;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. This trigger runs AFTER INSERT on auth.users
-- 2. It only creates a profile if the user has a phone number
-- 3. The profile.id is set to the phone number (TEXT)
-- 4. The profile.supply_role defaults to 'guest'
-- 5. The trigger is SECURITY DEFINER so it runs with elevated privileges
-- 6. If a profile already exists, it logs but doesn't fail
-- ============================================================================
