-- Normalisation des anciens profils sans "+"
-- 1) Retirer la contrainte si elle existe pour pouvoir corriger
alter table public.profiles drop constraint if exists profiles_phone_plus;

-- 2) Ajouter un "+" devant les numéros/IDs qui n'en ont pas
update public.profiles
set phone = '+' || phone,
    id    = '+' || id
where phone not like '+%';

-- 3) Recréer la contrainte pour empêcher toute régression
alter table public.profiles
  add constraint profiles_phone_plus
  check (phone like '+%' and id like '+%');
