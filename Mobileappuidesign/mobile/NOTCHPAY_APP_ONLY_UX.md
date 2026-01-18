# 🎯 NotchPay UX 2 Modes - App Only (Backend Stable)

## ✅ REVERT Complété

### Backend (Edge Function) - REVERTED ✅
```
supabase/functions/notchpay_init_payment/index.ts
- ❌ Suppression de EdgeFunctionResponse interface
- ❌ Suppression de mode / next_action
- ❌ Suppression de isMobileMoneyMode / isCardMode
- ✅ Retour à réponse simple: { provider_reference, authorization_url, provider_channel }
```

**Réponse Edge Function (stable) :**
```typescript
{
  provider_reference: string,
  authorization_url?: string,
  provider_channel?: string
}
```

---

## 🎨 UX 2 Modes - Côté App Uniquement

### Architecture
L'UX 2 modes se gère **UNIQUEMENT côté app** basée sur :
- `locked_channel` (cm.mtn, cm.orange, card)
- Présence/absence de `authorization_url`

### Mode 1: Mobile Money (cm.mtn / cm.orange)
```typescript
// Condition
if (lockedChannel === 'cm.mtn' || lockedChannel === 'cm.orange') {
  // Afficher modale: "Confirme sur ton téléphone"
  // Aucune WebView
  // Polling immédiat
}
```

**Comportement :**
- ✅ Pas de WebView
- ✅ Modale affiche "Confirme sur ton téléphone"
- ✅ App poll `payments.status` toutes les 2.5s pendant 90s max
- ✅ Webhook met à jour `payments.status` = success/failed

---

### Mode 2: Card (card)
```typescript
// Condition
if (lockedChannel === 'card' && authorizationUrl) {
  // Afficher modale avec WebView
  // WebView affiche authorization_url
  // Après fermeture, polling
}
```

**Comportement :**
- ✅ WebView dans modale affiche `authorization_url`
- ✅ User remplit formulaire carte
- ✅ User clique "Confirmer" ou ferme
- ✅ App continue polling (ne dépend pas du redirect)
- ✅ Webhook met à jour `payments.status` = success/failed

---

## 📁 Fichiers Modifiés

### Backend (REVERTED)
```
✅ supabase/functions/notchpay_init_payment/index.ts
   - Retour à version stable (sans mode/next_action)
   - Réponse simple: { provider_reference, authorization_url, provider_channel }
```

### App (UX 2 modes côté app)
```
✅ mobile/src/lib/services/notchpay.ts
   - initNotchPayPayment() retourne { providerReference, authorizationUrl, providerChannel }
   - Pas de mode/next_action

✅ mobile/src/hooks/useNotchPayPayment.ts
   - État inclut lockedChannel (au lieu de mode)
   - Logique gère 2 modes basée sur lockedChannel + authorizationUrl
   - Pas de dépendance à mode/next_action

✅ mobile/src/features/bookings/services/notchpay.ts
   - Utilise providerReference, authorizationUrl (camelCase)
   - Pas de mode/next_action

✅ mobile/src/features/rental-visits/services-notchpay.ts
   - Utilise providerReference, authorizationUrl (camelCase)
   - Pas de mode/next_action
```

---

## 🔧 Logique UX 2 Modes (Hook)

```typescript
// État du hook
interface NotchPayPaymentState {
  lockedChannel: 'cm.mtn' | 'cm.orange' | 'card' | null;
  authorizationUrl: string | null;
  // ... autres propriétés
}

// Logique 2 modes
if (notchPayResult.providerChannel === 'card' && notchPayResult.authorizationUrl) {
  // Mode Card: Ouvrir WebView
  await openPaymentUrl(notchPayResult.authorizationUrl);
} else if (notchPayResult.providerChannel === 'cm.mtn' || notchPayResult.providerChannel === 'cm.orange') {
  // Mode Mobile Money: Pas de WebView
  console.log('Modale: Confirme sur ton téléphone');
}

// Polling toujours lancé après init
const { payment, timedOut } = await pollPaymentStatus(paymentId);
```

---

## ✨ Règles Strictes

### ✅ Respectées
- ❌ Aucune clé NotchPay dans l'app
- ❌ Aucun appel direct à api.notchpay.co
- ✅ Webhook = source de vérité (`payments.status`)
- ✅ UX 2 modes côté app uniquement
- ✅ Backend stable et inchangé

### ❌ À Éviter
```typescript
// ❌ NE PAS dépendre de mode/next_action
if (response.mode === 'direct_mobile_money') { }

// ❌ NE PAS forcer success immédiatement
payments.update({ status: 'success' });

// ❌ NE PAS dépendre du redirect pour success
if (webViewClosed) { markAsSuccess(); }
```

---

## 📊 Flow Complet

### Mobile Money (cm.mtn / cm.orange)
```
1. User clique "Payer"
2. App crée payment PENDING
3. App appelle Edge Function
4. Edge Function retourne { provider_reference, authorization_url?, provider_channel }
5. App détecte: lockedChannel === 'cm.mtn' → Pas de WebView
6. App affiche modale: "Confirme sur ton téléphone"
7. App poll payments.status (2.5s, 90s max)
8. Webhook met à jour payments.status = success/failed
9. App détecte success → Booking/Visite confirmé
```

### Card
```
1. User clique "Payer"
2. App crée payment PENDING
3. App appelle Edge Function
4. Edge Function retourne { provider_reference, authorization_url, provider_channel }
5. App détecte: lockedChannel === 'card' + authorizationUrl → WebView
6. App affiche modale avec WebView sur authorization_url
7. User remplit formulaire carte
8. User clique "Confirmer" ou ferme
9. App continue polling payments.status (2.5s, 90s max)
10. Webhook met à jour payments.status = success/failed
11. App détecte success → Booking/Visite confirmé
```

---

## 🚀 Prochaines Étapes

1. **Brancher les écrans** :
   - Booking payment screen
   - Visit payment screen
   - Remaining payment screen

2. **Ajouter UI pour les 2 modes** :
   - Mobile Money: Modale "Confirme sur ton téléphone"
   - Card: Modale avec WebView

3. **Tester les 2 modes** :
   - Mobile Money: cm.mtn / cm.orange
   - Card: authorization_url + WebView

---

## ✅ Checklist Finale

- ✅ Backend REVERTED (pas de mode/next_action)
- ✅ App gère UX 2 modes basée sur lockedChannel + authorizationUrl
- ✅ Pas de dépendance à mode/next_action côté app
- ✅ Webhook = source de vérité
- ✅ Aucune clé NotchPay dans l'app
- ✅ Aucun appel direct api.notchpay.co

---

**Status :** ✅ **REVERT BACKEND COMPLÉTÉ - UX 2 MODES CÔTÉ APP STABLE**
