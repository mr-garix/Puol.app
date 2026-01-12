-- Supprimer le trigger automatique de création de profil
-- Les profils doivent être créés manuellement lors de l'inscription complète

drop trigger if exists create_profile_on_phone_confirmed on auth.users;
drop function if exists public.handle_user_phone_confirmed();
