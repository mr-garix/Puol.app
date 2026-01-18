# ✅ NotchPay Final Checklist - Avant Brancher Écrans

## 1️⃣ Snake_case → CamelCase Mapping ✅

**Edge Function retourne :**
```typescript
{
  provider_reference: string,
  authorization_url?: string,
  provider_channel?: string
}
```

**Service mappe vers :**
```typescript
// src/lib/services/notchpay.ts (lignes 199-201)
return {
  providerReference: data.provider_reference,      // ✅ CORRECT
  authorizationUrl: data.authorization_url,        // ✅ CORRECT
  providerChannel: data.provider_channel,          // ✅ CORRECT
};
```

**Vérification :** ✅ Card recevra `authorizationUrl` correctement.

---

## 2️⃣ Polling - Démarre Juste Après Init ✅

**Hook flow :**
```typescript
// src/hooks/useNotchPayPayment.ts (lignes 141-167)

// Étape 3: Gérer les 2 modes (WebView ou pas)
if (notchPayResult.providerChannel === 'card' && notchPayResult.authorizationUrl) {
  await openPaymentUrl(notchPayResult.authorizationUrl);  // WebView
} else if (notchPayResult.providerChannel === 'cm.mtn' || notchPayResult.providerChannel === 'cm.orange') {
  // Pas de WebView
}

// Étape 4: Polling TOUJOURS lancé après init (ligne 161)
const { payment: finalPayment, timedOut } = await pollPaymentStatus(payment.id, {
  maxDurationMs: 90000,
  intervalMs: 2500,
});
```

**Vérification :** ✅ Polling démarre pour TOUS les modes, indépendant de la WebView.

---

## 3️⃣ Règles UI Strictes ✅

### Rule 1: Card Mode
```typescript
if (lockedChannel === 'card' && authorizationUrl) {
  // ✅ Afficher WebView dans modale
  // ✅ WebView affiche authorizationUrl
  // ✅ Polling continue après fermeture
} else if (lockedChannel === 'card' && !authorizationUrl) {
  // ❌ ERREUR: Card sans URL
  // → Afficher erreur "Paiement non disponible"
}
```

### Rule 2: Mobile Money (cm.orange / cm.mtn)
```typescript
if (lockedChannel === 'cm.orange' || lockedChannel === 'cm.mtn') {
  // ✅ Pas de WebView
  // ✅ Modale affiche: "Confirme sur ton téléphone"
  // ✅ Polling immédiat
}
```

### Rule 3: Webhook = Vérité
```typescript
// ✅ CORRECT: Attendre webhook
if (finalPayment?.status === 'success') {
  // Succès confirmé par webhook
}

// ❌ JAMAIS: Forcer success côté app
payments.update({ status: 'success' });

// ❌ JAMAIS: Dépendre du redirect
if (webViewClosed) { markAsSuccess(); }
```

---

## 🎯 Checklist Avant Brancher

### Service Layer
- [x] `initNotchPayPayment()` mappe snake_case → camelCase
- [x] Retourne `{ providerReference, authorizationUrl, providerChannel }`
- [x] Pas de mode/next_action

### Hook Layer
- [x] `useNotchPayPayment()` gère 2 modes basée sur `providerChannel` + `authorizationUrl`
- [x] Polling démarre immédiatement après init
- [x] Polling indépendant de la WebView
- [x] État inclut `lockedChannel` et `authorizationUrl`

### Features Layer
- [x] `initBookingPaymentWithNotchPay()` utilise camelCase
- [x] `initVisitPaymentWithNotchPay()` utilise camelCase
- [x] Pas de dépendance à mode/next_action

### Backend
- [x] Edge Function REVERTED (pas de mode/next_action)
- [x] Retourne snake_case simple
- [x] Webhook met à jour `payments.status`

---

## 🎨 UI Rules à Implémenter dans Écrans

### Card Mode
```typescript
// Condition
if (lockedChannel === 'card' && authorizationUrl) {
  return (
    <Modal visible={isPaymentModalVisible}>
      <WebView source={{ uri: authorizationUrl }} />
      <Text>Complétez votre paiement</Text>
    </Modal>
  );
} else if (lockedChannel === 'card' && !authorizationUrl) {
  return <ErrorModal message="Paiement par carte non disponible" />;
}
```

### Mobile Money Mode
```typescript
// Condition
if (lockedChannel === 'cm.mtn' || lockedChannel === 'cm.orange') {
  return (
    <Modal visible={isPaymentModalVisible}>
      <Text>Confirme sur ton téléphone</Text>
      <ActivityIndicator />
      <Text>Vérification du paiement...</Text>
    </Modal>
  );
}
```

### Polling Status
```typescript
// Pour TOUS les modes
if (status === 'polling') {
  return <ActivityIndicator />;
}

if (status === 'success') {
  // Webhook a mis à jour payments.status = 'success'
  return <SuccessModal />;
}

if (status === 'failed') {
  // Webhook a mis à jour payments.status = 'failed'
  return <ErrorModal message={payment.failure_reason} />;
}

if (status === 'timeout') {
  // Polling timeout (90s)
  return (
    <Modal>
      <Text>Paiement en cours de confirmation</Text>
      <Button onPress={() => startPayment()}>Revérifier</Button>
      <Button onPress={() => reset()}>Relancer paiement</Button>
    </Modal>
  );
}
```

---

## 📋 Fichiers Prêts à Brancher

```
✅ mobile/src/lib/services/notchpay.ts
   - initNotchPayPayment() avec mapping camelCase

✅ mobile/src/hooks/useNotchPayPayment.ts
   - Logique 2 modes (card vs mobile money)
   - Polling immédiat après init

✅ mobile/src/features/bookings/services/notchpay.ts
   - Utilise camelCase

✅ mobile/src/features/rental-visits/services-notchpay.ts
   - Utilise camelCase

✅ supabase/functions/notchpay_init_payment/index.ts
   - Backend REVERTED (stable)
```

---

## ⚠️ Points Critiques à Vérifier dans Écrans

1. **Card sans URL** → Erreur explicite
2. **Polling continue** → Même pendant WebView
3. **Webhook = vérité** → Jamais success côté app
4. **Timeout UX** → Boutons "Revérifier" et "Relancer"
5. **Mobile Money** → Pas de WebView, message clair

---

**Status :** ✅ **PRÊT POUR BRANCHER LES ÉCRANS**
