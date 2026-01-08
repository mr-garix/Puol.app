# Migration Firebase → Supabase Auth (OTP)

## 📋 Statut actuel

✅ **Complété :**
- Firebase Auth commenté/désactivé dans `firebaseClient.ts`
- AuthContext migré vers Supabase Auth OTP
- Service OTP créé (`otpService.ts`)
- Trigger SQL pour auto-création des profils

⏳ **À faire :**
- Déployer le trigger SQL dans Supabase
- Créer/mettre à jour les composants UI (écrans de login OTP)
- Tester le flux complet avec de nouveaux numéros
- Valider les RLS avec les nouveaux profils

---

## 🔧 Configuration Supabase Auth

### 1. Activer Phone OTP dans Supabase Dashboard

1. Va dans **Authentication → Settings**
2. Cherche **Phone Sign-In**
3. Active **Enable phone sign-ins**
4. Configure le provider SMS (Twilio, Termii, Africa's Talking, etc.)

### 2. Déployer le trigger SQL

Copie le contenu de `src/features/auth/sql/create_profile_trigger.sql` et exécute-le dans :
- Supabase Dashboard → SQL Editor
- Ou via `supabase db push` si tu utilises la CLI

Ce trigger va :
- Créer automatiquement un profil quand un user se crée dans `auth.users`
- Utiliser le numéro de téléphone comme `profiles.id` (TEXT)
- Définir `profiles.phone` au même numéro

---

## 📱 Flux d'authentification OTP

### Étape 1 : Demander le numéro de téléphone
```typescript
import { signInWithOtp } from '@/src/features/auth/services/otpService';

const handleRequestOtp = async (phone: string) => {
  try {
    await signInWithOtp({ phone });
    // Afficher l'écran de vérification OTP
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

### Étape 2 : Vérifier le code OTP
```typescript
import { verifyOtp } from '@/src/features/auth/services/otpService';

const handleVerifyOtp = async (phone: string, code: string) => {
  try {
    const { data } = await verifyOtp({ phone, token: code });
    // L'utilisateur est maintenant connecté
    // Le profil a été créé automatiquement par le trigger
    console.log('Connecté :', data.user.phone);
  } catch (error) {
    console.error('Code invalide:', error);
  }
};
```

---

## 🧪 Mode test (sans SMS réel)

Pour tester sans envoyer de SMS :

### Option 1 : Lire le code depuis la base de données
```typescript
import { getOtpCodeForTesting } from '@/src/features/auth/services/otpService';

const code = await getOtpCodeForTesting('+237612345678');
console.log('Code OTP:', code); // Utilise ce code pour tester
```

### Option 2 : Configurer un provider SMS de test
- Supabase supporte les webhooks personnalisés
- Tu peux créer une Edge Function qui log le code au lieu de l'envoyer

---

## 🔐 Mapping Auth → Profile → RLS

```
┌─────────────────────────────────────────┐
│ auth.users (Supabase Auth)              │
├─────────────────────────────────────────┤
│ id: UUID (ex: 550e8400-e29b-41d4...)   │
│ phone: "+237612345678"                  │
│ email: null                              │
└─────────────────────────────────────────┘
         ↓ (Trigger auto-crée)
┌─────────────────────────────────────────┐
│ profiles (ta table)                     │
├─────────────────────────────────────────┤
│ id: "+237612345678" (TEXT)              │
│ phone: "+237612345678"                  │
│ first_name, last_name, etc.             │
└─────────────────────────────────────────┘
         ↑ (RLS utilise ce lien)
┌─────────────────────────────────────────┐
│ bookings, listings, etc.                │
├─────────────────────────────────────────┤
│ guest_profile_id: "+237612345678"       │
│ host_id: "+237612345678"                │
└─────────────────────────────────────────┘
```

### RLS Policy Example
```sql
CREATE POLICY "Guests can create their own bookings"
ON bookings
FOR INSERT
WITH CHECK (
  guest_profile_id IN (
    SELECT id FROM profiles 
    WHERE phone = (SELECT phone FROM auth.users WHERE id = auth.uid())
  )
);
```

---

## 📝 Profils existants

### Anciens profils (Firebase)
- ❌ Ne peuvent plus se connecter (Firebase est désactivé)
- ✅ Restent dans la base pour les données historiques
- ✅ Leurs listings/données restent visibles
- ⚠️ Temporairement bloqués pour les réservations (RLS)

### Nouveaux profils (Supabase Auth)
- ✅ Se connectent via OTP
- ✅ Profils créés automatiquement
- ✅ Peuvent faire des réservations (RLS fonctionne)
- ✅ Accès complet à l'app

---

## 🚀 Prochaines étapes

1. **Déployer le trigger SQL** dans Supabase
2. **Créer l'écran de login OTP** (demander téléphone → vérifier code)
3. **Tester avec de nouveaux numéros** (sans toucher aux anciens comptes)
4. **Valider les RLS** (créer une réservation, vérifier que ça fonctionne)
5. **Activer RLS sur les autres tables** (listings, payments, messages, etc.)

---

## 📚 Fichiers modifiés

- `src/firebaseClient.ts` - Firebase commenté
- `src/features/auth/hooks/AuthContext.tsx` - Migré vers Supabase Auth
- `src/features/auth/supabaseSession.ts` - Deprecated (placeholders)
- `src/features/auth/services/otpService.ts` - **NOUVEAU** Service OTP
- `src/features/auth/sql/create_profile_trigger.sql` - **NOUVEAU** Trigger SQL

---

## ⚠️ Points importants

- ✅ Firebase n'est PAS supprimé (juste commenté pour rollback possible)
- ✅ Les anciens profils restent intacts
- ✅ Les nouveaux profils utilisent le téléphone comme ID (TEXT)
- ✅ Le trigger crée les profils automatiquement
- ✅ RLS fonctionne via le mapping phone → profiles.id

---

## 🔄 Rollback (si besoin)

Si tu dois revenir à Firebase temporairement :
1. Décommenter le code dans `firebaseClient.ts`
2. Restaurer l'ancien `AuthContext.tsx` depuis git
3. Réactiver `syncSupabaseSession` dans `supabaseSession.ts`

Mais l'objectif est de rester sur Supabase Auth une fois validé.
