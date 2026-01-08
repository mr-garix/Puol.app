# Système de Connexion OTP pour le BackOffice Admin

## Vue d'ensemble

Le BackOffice utilise maintenant **Supabase Auth avec OTP par téléphone** pour l'authentification des administrateurs. Les admins se connectent avec leur numéro de téléphone et reçoivent un code OTP par SMS.

## Architecture

### 1. Service d'authentification (`adminAuthService.ts`)
- `sendAdminOtp(phoneNumber)` - Envoie un code OTP au numéro de téléphone
- `verifyAdminOtp(phoneNumber, code)` - Vérifie le code OTP et crée une session
- `getAdminProfile(phoneNumber)` - Récupère le profil admin depuis Supabase
- `createAdminProfile(phoneNumber, firstName, lastName)` - Crée un nouveau profil admin
- `logoutAdmin()` - Déconnecte l'admin
- `getCurrentAdminSession()` - Vérifie la session actuelle

### 2. Contexte d'authentification (`AdminAuthContext.tsx`)
- Gère l'état d'authentification global
- Persiste la session dans `localStorage` (30 jours)
- Vérifie la session Supabase au chargement
- Fournit les fonctions `loginWithOtp()` et `logout()`

### 3. Page de connexion (`AdminLoginPage.tsx`)
- Interface de connexion en deux étapes :
  1. Entrée du numéro de téléphone
  2. Entrée du code OTP
- Gestion des erreurs et des états de chargement
- Notifications toast pour le feedback utilisateur

### 4. Dashboard (`AdminDashboard.tsx`)
- Affiche la page de connexion si l'utilisateur n'est pas authentifié
- Affiche le dashboard si l'utilisateur est authentifié
- Gère le loader pendant la vérification de la session

## Configuration requise

### Variables d'environnement
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Rôle admin dans la base de données
Les admins doivent avoir `role = 'admin'` dans la table `profiles`.

## Utilisation

### 1. Créer un compte admin

Exécutez le script SQL `create_admin_role.sql` dans Supabase :

```sql
INSERT INTO profiles (
  id,
  phone,
  first_name,
  last_name,
  role,
  supply_role,
  is_certified,
  created_at,
  updated_at
) VALUES (
  '+237670844398',
  '+237670844398',
  'Admin',
  'BackOffice',
  'admin',
  'none',
  true,
  NOW(),
  NOW()
);
```

### 2. Se connecter au BackOffice

1. Accédez à la page du BackOffice
2. Entrez votre numéro de téléphone (format : +237XXXXXXXXX)
3. Cliquez sur "Envoyer le code OTP"
4. Recevez le code OTP par SMS
5. Entrez le code OTP (6 chiffres)
6. Cliquez sur "Vérifier le code"
7. Vous êtes maintenant connecté au BackOffice

### 3. Accès aux données

Les admins ont accès complet à toutes les tables via les RLS policies :
- `profiles` - Tous les profils utilisateurs
- `listings` - Toutes les annonces
- `bookings` - Toutes les réservations
- `payments` - Tous les paiements
- Et toutes les autres tables critiques

## Flux d'authentification

```
┌─────────────────────────────────────────────────────────┐
│ 1. Utilisateur accède au BackOffice                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. AdminAuthContext vérifie la session localStorage     │
└─────────────────────────────────────────────────────────┘
                          ↓
                    ┌─────┴─────┐
                    ↓           ↓
            Session valide  Session invalide
                    ↓           ↓
            Affiche le    Affiche la page
            dashboard     de connexion
                          ↓
        ┌─────────────────────────────────────┐
        │ 3. Utilisateur entre son téléphone  │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │ 4. sendAdminOtp() envoie l'OTP      │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │ 5. Utilisateur entre le code OTP    │
        └─────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │ 6. verifyAdminOtp() vérifie le code │
        └─────────────────────────────────────┘
                          ↓
                    ┌─────┴─────┐
                    ↓           ↓
                Succès      Erreur
                    ↓           ↓
            Crée la session  Affiche erreur
            Affiche le       Redemande OTP
            dashboard
```

## Sécurité

### RLS Policies
Les admins ont accès complet via les RLS policies qui vérifient :
```sql
(SELECT role FROM profiles WHERE id = auth.jwt() ->> 'phone') = 'admin'
```

### Session
- Durée : 30 jours
- Stockage : `localStorage` (chiffré par le navigateur)
- Vérification : À chaque chargement de l'app

### Authentification
- Méthode : OTP par SMS via Supabase Auth
- Format téléphone : E.164 (+237XXXXXXXXX)
- Vérification : Supabase valide le code automatiquement

## Prochaines étapes

1. **Appliquer les RLS policies** à toutes les tables critiques
2. **Créer des comptes admin** pour chaque administrateur
3. **Tester la connexion OTP** avec les vrais numéros de téléphone
4. **Configurer les notifications SMS** dans Supabase
5. **Implémenter les logs d'audit** pour les actions admin

## Dépannage

### "Unauthorized: User is not an admin"
- Vérifiez que le profil a `role = 'admin'` dans la table `profiles`
- Vérifiez que le numéro de téléphone est correct

### "OTP verification failed"
- Vérifiez que le code OTP est correct
- Vérifiez que le code n'a pas expiré (généralement 10 minutes)
- Demandez un nouveau code OTP

### "Supabase not configured"
- Vérifiez les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
- Vérifiez que Supabase est accessible

## Fichiers créés

- `src/lib/adminAuthService.ts` - Service d'authentification OTP
- `src/components/admin/AdminLoginPage.tsx` - Page de connexion OTP
- `src/contexts/AdminAuthContext.tsx` - Contexte d'authentification (modifié)
- `src/components/admin/AdminDashboard.tsx` - Dashboard (modifié)
- `src/sql/create_admin_role.sql` - Script SQL pour créer les rôles admin et les RLS policies
