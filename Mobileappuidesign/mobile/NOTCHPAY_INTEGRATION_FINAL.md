# 🎯 Intégration NotchPay - Checklist Stricte Finalisée

## ✅ Checklist Complète

### 1️⃣ ANCIEN SYSTÈME V1 - DÉSACTIVÉ ✅
- ❌ Suppression de `createPaymentAndEarning()` des écrans de paiement
- ❌ Suppression de l'import dans `src/features/bookings/services/index.ts`
- ❌ Suppression de l'appel dans `src/contexts/VisitsContext.tsx`
- ✅ Paiement géré **UNIQUEMENT** via NotchPay côté écran
- ✅ Aucun `status='success'` marqué immédiatement côté app

**Fichiers modifiés :**
- `@/mobile/src/features/bookings/services/index.ts` (ligne 1-4, 775-779)
- `@/mobile/src/contexts/VisitsContext.tsx` (ligne 430-446)

---

### 2️⃣ SERVICES NOTCHPAY - UNIFIÉS ✅

**Architecture :**
```
src/lib/services/notchpay.ts (CORE - Source de vérité)
├── createPendingPaymentForNotchPay()
├── initNotchPayPayment()
├── openPaymentUrl()
├── pollPaymentStatus()
├── getPaymentById()
└── getPaymentByReference()

src/features/bookings/services/notchpay.ts (ORCHESTRATION)
├── initBookingPaymentWithNotchPay()
├── initBookingRemainingPaymentWithNotchPay()
├── processBookingPaymentWithNotchPay() ← Flow complet
└── processBookingRemainingPaymentWithNotchPay() ← Flow complet

src/features/rental-visits/services-notchpay.ts (ORCHESTRATION)
├── initVisitPaymentWithNotchPay()
└── processVisitPaymentWithNotchPay() ← Flow complet

src/hooks/useNotchPayPayment.ts (HOOK - Combine tout)
└── useNotchPayPayment() ← Hook complet pour les écrans
```

**Avantages :**
- ✅ Pas de duplication logique bas niveau
- ✅ Services features orchestrent uniquement
- ✅ Core service = source de vérité
- ✅ Hook pour simplifier l'usage dans les écrans

---

### 3️⃣ URL EDGE FUNCTION - VÉRIFIÉE ✅

**Endpoint correct :**
```typescript
supabase.functions.invoke('notchpay_init_payment', {
  body: {
    payment_id: string,
    amount: number,
    currency: 'XAF',
    phone: string,
    locked_country: 'CM',
    locked_channel: 'cm.mtn' | 'cm.orange' | 'card',
    description?: string,
    reference?: string,
  }
})
```

**Localisation :** `@/Mobileappuidesign/supabase/functions/notchpay_init_payment/index.ts`

**Réponse attendue :**
```typescript
{
  provider_reference: string,
  authorization_url?: string,
  provider_channel?: string
}
```

---

### 4️⃣ PHONE + CHANNEL - VALIDÉS ✅

**Format téléphone :**
- ✅ Format international attendu : `+237XXXXXXXXX` ou `237XXXXXXXXX`
- ✅ Backend normalise automatiquement
- ✅ App doit envoyer sans espaces

**Channel valides :**
```typescript
type NotchPayChannel = 'cm.mtn' | 'cm.orange' | 'card'
```

**Locked country :**
```typescript
locked_country: 'CM' // Fixe pour Cameroun
currency: 'XAF'      // Fixe pour FCFA
```

---

### 5️⃣ FLOW UI - À BRANCHER 🔄

#### Booking Payment Flow
```typescript
// 1. Écran de paiement reçoit booking ID
const { status, startPayment } = useNotchPayPayment({
  onSuccess: (payment) => {
    // Marquer booking comme payé
    await markBookingPaid(bookingId);
    // Naviguer vers confirmation
  },
  onFailed: (payment) => {
    // Afficher erreur
    // Proposer retry
  },
  onTimeout: () => {
    // Afficher "Paiement en cours"
    // Bouton "Revérifier"
  }
});

// 2. Au clic "Payer"
await startPayment({
  payerProfileId: guestId,
  purpose: 'booking',
  relatedId: bookingId,
  amount: totalPrice,
  channel: 'cm.mtn', // Choix utilisateur
  customerPhone: '+237XXXXXXXXX',
  customerPrice: totalPrice,
});
```

#### Visit Payment Flow
```typescript
// Similaire mais avec purpose: 'visite'
await startPayment({
  payerProfileId: guestId,
  purpose: 'visite',
  relatedId: visitId,
  amount: 5000, // FCFA fixe
  channel: selectedChannel,
  customerPhone: userPhone,
});
```

#### Booking Remaining Payment Flow
```typescript
// Paiement du solde
await startPayment({
  payerProfileId: guestId,
  purpose: 'booking_remaining',
  relatedId: bookingId,
  amount: remainingAmount,
  channel: selectedChannel,
  customerPhone: userPhone,
  customerPrice: remainingAmount,
});
```

---

### 6️⃣ TIMEOUT / RETRY UX ✅

**Comportement :**
```typescript
if (status === 'timeout') {
  // Afficher modal
  <Modal title="Paiement en cours">
    <Text>Nous vérifions votre paiement...</Text>
    <Button onPress={() => {
      // Re-poll le même payment_id
      const { payment } = await pollPaymentStatus(paymentId);
      if (payment?.status === 'success') {
        // Succès
      }
    }}>
      Revérifier
    </Button>
    <Button onPress={() => {
      // Créer un nouveau payment
      await startPayment({...});
    }}>
      Relancer paiement
    </Button>
  </Modal>
}

if (status === 'failed') {
  // Afficher erreur avec raison
  <Modal title="Paiement échoué">
    <Text>{payment.failure_reason}</Text>
    <Button onPress={() => reset()}>
      Réessayer
    </Button>
  </Modal>
}
```

---

## 📁 Fichiers Modifiés / Créés

| Fichier | Action | Ligne(s) |
|---------|--------|----------|
| `src/lib/services/notchpay.ts` | **Modifié** | +3 imports, +openPaymentUrl(), +getPaymentById(), +pollPaymentStatus() |
| `src/hooks/useNotchPayPayment.ts` | **CRÉÉ** | Hook complet pour le flow |
| `src/hooks/index.ts` | **Modifié** | +exports useNotchPayPayment |
| `src/features/bookings/services/notchpay.ts` | **Modifié** | +processBookingPaymentWithNotchPay(), +processBookingRemainingPaymentWithNotchPay() |
| `src/features/rental-visits/services-notchpay.ts` | **Modifié** | +processVisitPaymentWithNotchPay() |
| `src/features/bookings/services/index.ts` | **Modifié** | -import createPaymentAndEarning, -appel V1, +commentaire NotchPay |
| `src/contexts/VisitsContext.tsx` | **Modifié** | -import createPaymentAndEarning, -appel V1, +commentaire NotchPay |

---

## 🧪 Test Scenarios

### Scenario 1: Booking Payment - Success
```
1. Utilisateur crée booking (status: pending, payment_status: pending)
2. Écran affiche "Payer maintenant"
3. Utilisateur clique "Payer"
4. Hook appelle startPayment()
   ├─ Crée payment PENDING
   ├─ Init NotchPay (Edge Function)
   ├─ Ouvre authorization_url (WebBrowser)
   └─ Poll payments.status
5. Utilisateur complète paiement NotchPay
6. Webhook met à jour payments.status = 'success'
7. Poll détecte success
8. Hook appelle onSuccess()
9. App appelle markBookingPaid()
10. Booking passe à status: 'confirmed', payment_status: 'paid'
✅ Réservation confirmée
```

### Scenario 2: Visit Payment - Failed
```
1. Utilisateur crée visite (status: pending, payment_status: pending)
2. Écran affiche "Payer 5000 FCFA"
3. Utilisateur clique "Payer"
4. Hook appelle startPayment()
   ├─ Crée payment PENDING
   ├─ Init NotchPay
   ├─ Ouvre authorization_url
   └─ Poll payments.status
5. Utilisateur annule ou erreur NotchPay
6. Webhook met à jour payments.status = 'failed'
7. Poll détecte failed
8. Hook appelle onFailed()
9. App affiche erreur avec failure_reason
10. Utilisateur clique "Réessayer"
11. Hook reset() + relancer startPayment()
✅ Retry possible
```

### Scenario 3: Booking Remaining - Timeout
```
1. Host demande paiement du solde (remaining_payment_status: 'requested')
2. Guest clique "Payer le solde"
3. Hook appelle startPayment() avec purpose: 'booking_remaining'
4. Paiement lancé mais timeout atteint (90s)
5. Hook appelle onTimeout()
6. App affiche modal "Paiement en cours"
7. Guest clique "Revérifier"
8. App re-poll le même payment_id
9. Webhook a mis à jour status = 'success' entre-temps
10. Poll détecte success
✅ Paiement confirmé après revérification
```

---

## 🚀 Prochaines Étapes

### À Faire Immédiatement
1. **Brancher les écrans** :
   - `app/property/[id].tsx` - Écran visite
   - `app/host-reservations/[id].tsx` - Écran booking payment
   - Écrans de paiement existants

2. **Ajouter UI pour timeout/retry** :
   - Modal "Paiement en cours"
   - Boutons "Revérifier" / "Relancer"

3. **Tester les 3 scenarios** :
   - Booking success
   - Visit failed
   - Remaining timeout

### À Vérifier
- ✅ Aucune clé NotchPay dans l'app
- ✅ Aucun appel direct à api.notchpay.co
- ✅ Toutes les requêtes via Edge Function
- ✅ Webhook Supabase met à jour payments.status
- ✅ App ne force jamais status='success'

---

## 📊 Résumé Architecture

```
┌─────────────────────────────────────────────────────────┐
│ APP MOBILE (Expo/React Native)                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Écrans de Paiement                                     │
│  ├─ Booking Payment Screen                             │
│  ├─ Visit Payment Screen                               │
│  └─ Remaining Payment Screen                           │
│         │                                               │
│         ▼                                               │
│  useNotchPayPayment() Hook                             │
│         │                                               │
│         ├─ startPayment()                              │
│         ├─ reset()                                     │
│         └─ status: idle|creating|initializing|...     │
│         │                                               │
│         ▼                                               │
│  src/lib/services/notchpay.ts (CORE)                  │
│  ├─ createPendingPaymentForNotchPay()                 │
│  ├─ initNotchPayPayment()                             │
│  ├─ openPaymentUrl() ← WebBrowser                     │
│  ├─ pollPaymentStatus() ← 2.5s interval               │
│  └─ getPaymentById()                                  │
│         │                                               │
│         ▼                                               │
│  supabase.functions.invoke('notchpay_init_payment')   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ SUPABASE BACKEND                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Edge Function: notchpay_init_payment                  │
│  ├─ Reçoit payment_id, amount, phone, channel         │
│  ├─ Appelle api.notchpay.co (CLÉS SÉCURISÉES)        │
│  ├─ Met à jour payments (provider_reference, URL)     │
│  └─ Retourne authorization_url                        │
│         │                                               │
│         ▼                                               │
│  Webhook: notchpay_webhook                            │
│  ├─ Reçoit confirmation NotchPay                      │
│  ├─ Met à jour payments.status (success/failed)       │
│  └─ Crée host_earnings (si success)                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Points Clés

- **Une seule source de vérité** : `payments.status` mis à jour par webhook
- **Aucun paiement forcé success** : App attend webhook
- **Polling robuste** : 90s max, 2.5s interval, gère timeout
- **UX complète** : Success, failed, timeout avec retry
- **Pas de clés NotchPay** : Tout sécurisé côté backend
- **Services unifiés** : Core + orchestration + hook

---

**Status :** ✅ PRÊT POUR INTÉGRATION AUX ÉCRANS
