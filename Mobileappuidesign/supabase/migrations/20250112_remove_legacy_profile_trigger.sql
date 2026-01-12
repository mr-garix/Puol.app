-- Supprimer l'ancien trigger qui créait des profils sans + et avant vérification OTP
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- On laisse uniquement le trigger create_profile_on_phone_confirmed (handle_user_phone_confirmed)
