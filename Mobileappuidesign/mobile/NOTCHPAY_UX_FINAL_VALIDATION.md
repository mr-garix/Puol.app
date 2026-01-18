# 🎯 Validation UX Finale NotchPay - 2 Modes Distincts

## Architecture Finale

### Mode 1: Mobile Money (cm.orange / cm.mtn) - NO WebView ✅

**Edge Function Flow:**
```
1. POST /payments (init) → récupère provider_reference
2. POST /payments/{provider_reference} avec body { channel: locked_channel, data: { phone } }
3. Retour app: 
   {
     ok: true,
     mode: "direct_mobile_money",
     next_action: "confirm_on_phone",
     payment_id: string,
     provider_reference: string
   }
```

**Côté App:**
```typescript
// Pas de WebView
// Modale affiche: "Confirme sur ton téléphone"
// App poll payments.status toutes les 2.5s pendant 90s max

if (notchPayResult.mode === 'direct_mobile_money') {
  // Afficher modale: "Confirme sur ton téléphone"
  // Pas d'ouverture WebView
  // Lancer polling immédiatement
  await pollPaymentStatus(paymentId);
}
```

---

### Mode 2: Card - WebView dans MA MODALE ✅

**Edge Function Flow:**
```
1. POST /payments (init)
2. Retour app: 
   {
     ok: true,
     mode: "hosted_card",
     next_action: "open_webview",
     payment_id: string,
     provider_reference: string,
     authorization_url: string
   }
```

**Côté App (Modal):**
```typescript
// Si mode == "hosted_card": afficher WebView IN-APP dans la modale
if (notchPayResult.mode === 'hosted_card' && notchPayResult.authorization_url) {
  // Afficher WebView dans la modale sur authorization_url
  await openPaymentUrl(notchPayResult.authorization_url);
  
  // Dès que l'utilisateur termine / ferme / redirect:
  // On continue le polling payments.status jusqu'à success/failed/timeout
  
  // Important: on ne dépend pas du redirect pour "success"
  // C'est le webhook qui met success/failed
}
```

---

## Règles Strictes ✅

### ❌ Jamais Faire

```typescript
// ❌ INTERDIT: Clé NotchPay dans l'app
const NOTCHPAY_PUBLIC_KEY = "..."; // JAMAIS

// ❌ INTERDIT: Appel direct api.notchpay.co depuis l'app
fetch('https://api.notchpay.co/payments', {...}); // JAMAIS

// ❌ INTERDIT: Forcer status='success' immédiatement
payments.update({ status: 'success' }); // JAMAIS

// ❌ INTERDIT: Dépendre du redirect pour success
if (webViewClosed) {
  markAsSuccess(); // JAMAIS - attendre webhook
}
```

### ✅ Toujours Faire

```typescript
// ✅ CORRECT: Appeler Edge Function uniquement
supabase.functions.invoke('notchpay_init_payment', { body: {...} });

// ✅ CORRECT: Webhook = source de vérité
// Webhook met à jour payments.status = 'success' ou 'failed'

// ✅ CORRECT: App poll le statut
const { payment } = await pollPaymentStatus(paymentId);
if (payment.status === 'success') {
  // Succès confirmé par webhook
}

// ✅ CORRECT: Pas de clés sensibles dans l'app
// Toutes les clés NotchPay côté Edge Function (Supabase)
```

---

## Flow Complet par Mode

### Mode 1: Mobile Money (cm.mtn / cm.orange)

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER CLIQUE "PAYER"                                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. APP: createPendingPaymentForNotchPay()               │
│    → Crée payment PENDING en DB                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. APP: initNotchPayPayment()                           │
│    → Appelle Edge Function                              │
│    → Edge Function appelle api.notchpay.co              │
│    → Retour: mode="direct_mobile_money"                 │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. APP: Afficher MODALE                                 │
│    "Confirme sur ton téléphone"                         │
│    (Pas de WebView)                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. APP: pollPaymentStatus()                             │
│    → Poll toutes les 2.5s pendant 90s max               │
│    → Webhook met à jour payments.status                 │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. RÉSULTAT                                             │
│    ✅ success → Booking/Visite confirmé                 │
│    ❌ failed → Afficher erreur + retry                  │
│    ⏱️ timeout → Afficher "Paiement en cours"            │
└─────────────────────────────────────────────────────────┘
```

---

### Mode 2: Card (WebView)

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER CLIQUE "PAYER"                                  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. APP: createPendingPaymentForNotchPay()               │
│    → Crée payment PENDING en DB                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 3. APP: initNotchPayPayment()                           │
│    → Appelle Edge Function                              │
│    → Edge Function appelle api.notchpay.co              │
│    → Retour: mode="hosted_card", authorization_url     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 4. APP: Afficher MODALE avec WEBVIEW                    │
│    → WebView affiche authorization_url                  │
│    → User remplit formulaire carte                      │
│    → User clique "Confirmer"                            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 5. APP: WebView se ferme (redirect ou user ferme)       │
│    → Continuer polling (ne pas dépendre du redirect)    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 6. APP: pollPaymentStatus()                             │
│    → Poll toutes les 2.5s pendant 90s max               │
│    → Webhook met à jour payments.status                 │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 7. RÉSULTAT                                             │
│    ✅ success → Booking/Visite confirmé                 │
│    ❌ failed → Afficher erreur + retry                  │
│    ⏱️ timeout → Afficher "Paiement en cours"            │
└─────────────────────────────────────────────────────────┘
```

---

## Code Implémentation

### Hook useNotchPayPayment - Gestion des 2 modes

```typescript
// État du hook
interface NotchPayPaymentState {
  isLoading: boolean;
  isPolling: boolean;
  paymentId: string | null;
  providerReference: string | null;
  mode: 'direct_mobile_money' | 'hosted_card' | null;  // ← Mode détecté
  authorizationUrl: string | null;                      // ← URL Card
  status: 'idle' | 'creating' | 'initializing' | 'awaiting_payment' | 'polling' | 'success' | 'failed' | 'timeout' | 'error';
  error: string | null;
}

// Utilisation dans l'écran
const { mode, authorizationUrl, status, startPayment } = useNotchPayPayment({
  onSuccess: (payment) => {
    // Marquer booking/visite comme payé
  },
  onFailed: (payment) => {
    // Afficher erreur
  },
  onTimeout: () => {
    // Afficher "Paiement en cours"
  }
});

// Démarrer le paiement
await startPayment({
  payerProfileId: guestId,
  purpose: 'booking',
  relatedId: bookingId,
  amount: totalPrice,
  channel: 'cm.mtn', // User choisit
  customerPhone: userPhone,
  customerPrice: totalPrice,
});

// Afficher UI selon le mode
if (mode === 'direct_mobile_money') {
  // Modale: "Confirme sur ton téléphone"
} else if (mode === 'hosted_card') {
  // Modale avec WebView: authorization_url
}
```

---

## Service notchpay.ts - Réponse Edge Function

```typescript
export interface InitNotchPayResponse {
  ok: boolean;
  mode: 'direct_mobile_money' | 'hosted_card';
  next_action?: 'confirm_on_phone' | 'open_webview';
  payment_id: string;
  provider_reference: string;
  authorization_url?: string;  // Seulement si mode === 'hosted_card'
  error?: string;
}

// Utilisation
const response = await initNotchPayPayment({...});

if (response.ok) {
  if (response.mode === 'direct_mobile_money') {
    // Pas de WebView
    // Afficher modale "Confirme sur ton téléphone"
    // Lancer polling
  } else if (response.mode === 'hosted_card') {
    // Afficher WebView avec response.authorization_url
    // Après fermeture, lancer polling
  }
}
```

---

## Edge Function notchpay_init_payment - Réponse

```typescript
interface EdgeFunctionResponse {
  ok: boolean;
  mode: 'direct_mobile_money' | 'hosted_card';
  next_action?: 'confirm_on_phone' | 'open_webview';
  payment_id: string;
  provider_reference: string;
  authorization_url?: string;
  error?: string;
}

// Détection du mode
const isMobileMoneyMode = body.locked_channel === 'cm.mtn' || body.locked_channel === 'cm.orange';
const isCardMode = body.locked_channel === 'card';

// Réponse
const response: EdgeFunctionResponse = {
  ok: true,
  mode: isMobileMoneyMode ? 'direct_mobile_money' : 'hosted_card',
  next_action: isMobileMoneyMode ? 'confirm_on_phone' : 'open_webview',
  payment_id: body.payment_id,
  provider_reference: providerReference,
  authorization_url: authorizationUrl || undefined,
};
```

---

## Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/notchpay_init_payment/index.ts` | ✅ Gère 2 modes, retourne `mode` et `next_action` |
| `src/lib/services/notchpay.ts` | ✅ Interface `InitNotchPayResponse`, gère 2 modes |
| `src/hooks/useNotchPayPayment.ts` | ✅ État `mode` et `authorizationUrl`, logique 2 modes |

---

## Checklist Finale ✅

- ✅ **Mode Mobile Money** : Pas de WebView, modale "Confirme sur ton téléphone"
- ✅ **Mode Card** : WebView dans modale, affiche authorization_url
- ✅ **Polling** : Toujours lancé après init, indépendant du mode
- ✅ **Webhook = Vérité** : payments.status mis à jour par webhook
- ✅ **Pas de clés NotchPay** : Toutes côté Edge Function
- ✅ **Pas d'appels directs** : Tout via Edge Function
- ✅ **Pas de success forcé** : Attendre webhook
- ✅ **Timeout/Retry UX** : Géré par le hook

---

**Status :** ✅ **VALIDATION UX FINALE COMPLÈTE**
