# 🚀 Guide d'Intégration NotchPay - PUOL

## 📋 Résumé Exécutif

Intégration complète de NotchPay (Orange Money / MTN MoMo / Carte) avec flux de paiement **PENDING** confirmé par webhook.

**Architecture clé :**
- Booking/Visite créés AVANT paiement (status pending)
- Paiement créé en status PENDING
- Webhook NotchPay confirme success/failed
- Host earnings créés APRÈS confirmation webhook

---

## ✅ État de la Base de Données

### Tables existantes (VÉRIFIÉES dans supabase.generated.ts)

**Table `payments` - Colonnes OK :**
```
- provider_channel (text null)
- provider_payment_url (text null)
- idempotency_key (text null) ← unique index requis
- raw_provider_payload (jsonb null)
- failure_reason (text null)
- client_payload (jsonb null)
- provider_reference (text null)
- purpose (string) ← 'booking' | 'booking_remaining' | 'visite'
- status (string) ← 'pending' | 'success' | 'failed' | 'refunded'
```

**Table `rental_visits` - Colonnes OK :**
```
- payment_status (string null) ← 'pending' | 'paid' | 'failed' | 'refunded'
```

✅ **AUCUNE migration DB requise - tout est prêt !**

---

## 🔧 À CRÉER côté Backend (Supabase)

### 1️⃣ Edge Function: `notchpay_init_payment`

**Endpoint :** `POST /functions/v1/notchpay_init_payment`

**Entrée (JSON) :**
```typescript
{
  purpose: "booking" | "booking_remaining" | "visite",
  related_id: string,         // booking.id ou visit.id
  amount: number,
  currency: "XAF",
  channel: "cm.mtn" | "cm.orange" | "card",
  payer_profile_id: string,
  customer_phone?: string,    // pour MoMo
  customer_email?: string,
  customer_name?: string
}
```

**Traitement :**
1. Vérifier que `related_id` existe (bookings ou rental_visits)
2. Mettre à jour la ligne payments existante OU la créer si pas existante :
   - `provider='notchpay'`
   - `status='pending'`
   - `purpose` correct
   - `related_id` correct
   - `provider_channel=channel`
   - `idempotency_key` set (si pas déjà)
3. Appeler Notch Pay API pour init la transaction :
   - Récupérer `provider_reference` (reference NotchPay)
   - Récupérer `provider_payment_url` (authorization_url si carte)
4. Update payments :
   - `provider_reference` = reference NotchPay
   - `provider_payment_url` = authorization_url (si carte)
   - `raw_provider_payload` = response init (optionnel)
5. Retourner à l'app :
```typescript
{
  provider_reference: string,
  provider_payment_url?: string,
  provider_channel: string
}
```

**Env vars :**
```
NOTCHPAY_PUBLIC_KEY
NOTCHPAY_SECRET_KEY
NOTCHPAY_BASE_URL (prod/sandbox)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

### 2️⃣ Edge Function: `notchpay_webhook`

**Endpoint :** `POST /functions/v1/notchpay_webhook`

**Signature verification :**
- Header: `X-Notch-Signature`
- Signature = HMAC SHA-256 du RAW BODY avec secret `NOTCHPAY_WEBHOOK_HASH`

**Env vars :**
```
NOTCHPAY_WEBHOOK_HASH (Hash Key NotchPay)
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**Traitement webhook :**

1. **Retrouver payment row** via `provider_reference` (reference NotchPay)

2. **Update payments.status** selon `payment.status` du webhook :
   - `payment.complete` → `success`
   - `payment.failed` → `failed`
   - `payment.processing` → `pending`

3. **Remplir champs payments :**
   - `paid_at` si success
   - `failure_reason` si failed
   - `raw_provider_payload` = payload webhook

4. **Update tables métier selon `payments.purpose` + `payments.related_id` :**

#### A) purpose='booking' + success
```sql
-- Lire bookings.remaining_amount
-- Si remaining_amount > 0 :
UPDATE bookings SET payment_status='partially_paid' WHERE id=related_id
-- Sinon :
UPDATE bookings SET payment_status='paid' WHERE id=related_id

-- Créer host_earnings (90% host, 10% plateforme)
-- Créer host_payouts
```

#### B) purpose='booking' + failed
```sql
UPDATE bookings SET payment_status='failed' WHERE id=related_id
```

#### C) purpose='booking_remaining' + success
```sql
UPDATE bookings SET 
  remaining_amount=0,
  remaining_payment_status='paid',
  payment_status='paid'
WHERE id=related_id

-- Créer host_earnings pour le remaining
-- Créer host_payouts
```

#### D) purpose='booking_remaining' + failed
```sql
-- Ne pas forcer payment_status (laisser l'état courant)
-- payments.failed suffit
```

#### E) purpose='visite' + success
```sql
UPDATE rental_visits SET 
  payment_status='paid',
  status='confirmed'
WHERE id=related_id
```

#### F) purpose='visite' + failed
```sql
UPDATE rental_visits SET 
  payment_status='failed',
  status='cancelled',
  cancelled_at=now(),
  cancelled_reason='Payment failed'
WHERE id=related_id
```

**NOTE :** Refunds/payouts manuels (pas d'API en V1)

---

## 📱 Modifications côté App (Expo/React Native)

### Fichiers créés :

1. **`src/lib/services/notchpay.ts`** ✅ CRÉÉ
   - `createPendingPaymentForNotchPay()` - Crée payment pending
   - `initNotchPayPayment()` - Appelle edge function init
   - `getPaymentByReference()` - Récupère payment par reference
   - `getPaymentByRelatedId()` - Récupère payment par related_id

2. **`src/hooks/usePaymentPolling.ts`** ✅ CRÉÉ
   - `usePaymentPolling()` - Hook de polling (2s, max 90s)
   - `useBookingPaymentStatus()` - Écoute booking.payment_status
   - `useVisitPaymentStatus()` - Écoute visit.payment_status

3. **`src/features/bookings/services/notchpay.ts`** ✅ CRÉÉ
   - `createBookingWithNotchPaySimplified()` - Crée booking pending
   - `initBookingPaymentWithNotchPay()` - Init paiement + NotchPay
   - `initBookingRemainingPaymentWithNotchPay()` - Init remaining payment

4. **`src/features/rental-visits/services-notchpay.ts`** ✅ CRÉÉ
   - `createRentalVisitWithNotchPay()` - Crée visite pending
   - `initVisitPaymentWithNotchPay()` - Init paiement + NotchPay

### Flux d'utilisation (Bookings) :

```typescript
// 1. Créer booking avec payment_status='pending'
const booking = await createBookingWithNotchPaySimplified({
  listingId,
  guestProfileId,
  checkInDate,
  checkOutDate,
  nights,
  nightlyPrice,
  totalPrice,
});

// 2. Initialiser paiement + NotchPay
const paymentInfo = await initBookingPaymentWithNotchPay({
  bookingId: booking.id,
  guestProfileId,
  hostProfileId,
  totalPrice,
  channel: 'cm.mtn', // ou 'cm.orange' ou 'card'
  customerPhone,
});

// 3. Lancer paiement dans Modal
// - Si card : ouvrir WebView avec paymentInfo.providerPaymentUrl
// - Si MoMo : afficher UI "Veuillez valider sur votre téléphone..."

// 4. Polling DB (hook usePaymentPolling)
const { status, payment, isPolling } = usePaymentPolling({
  providerReference: paymentInfo.providerReference,
  maxDurationMs: 90000,
  intervalMs: 2000,
  onSuccess: (payment) => {
    // Afficher succès + refresh booking
  },
  onFailed: (payment) => {
    // Afficher erreur + permettre retry
  },
});
```

### Flux d'utilisation (Visites) :

```typescript
// 1. Créer visite avec payment_status='pending'
const visit = await createRentalVisitWithNotchPay({
  listingId,
  guestProfileId,
  visitDate,
  visitTime,
});

// 2. Initialiser paiement + NotchPay
const paymentInfo = await initVisitPaymentWithNotchPay({
  visitId: visit.id,
  guestProfileId,
  channel: 'cm.mtn',
  customerPhone,
});

// 3. Lancer paiement + polling (même que bookings)
```

---

## 🎨 UI/UX Modal Paiement

### Étapes :

1. **Choix du canal :** MTN / Orange / Carte
2. **Au clic "Payer" :**
   - Booking/Visite déjà créé (pending)
   - Payment row créé (pending)
   - Appel edge function → récup reference + URL (si carte)
3. **Lancer paiement :**
   - **Carte :** WebView avec `provider_payment_url`
   - **MoMo :** UI "Veuillez valider sur votre téléphone..." + loader
4. **Polling DB :**
   - Toutes les 2-3 secondes pendant max 90s
   - Fetch payment par `provider_reference` OU `related_id+purpose`
   - Si `status == success` → Succès UI + refresh booking/visit
   - Si `failed` → Erreur UI + permettre retry
   - Si timeout → "En attente" + bouton "Réessayer vérifier"

**IMPORTANT :** UI de succès basée sur DB (`payments.status` + `booking.payment_status` / `visit.payment_status`), pas sur retour immédiat NotchPay

---

## 📊 Montants & Commissions

| Type | Montant | Commission | Host |
|------|---------|-----------|------|
| Booking | Variable (prix * 1.1) | 10% | 90% |
| Booking Remaining | Variable (remaining) | 10% | 90% |
| Visite | 5000 FCFA fixe | 100% | 0% |

---

## 🔄 Changements d'architecture

### Avant (V1) :
```
createPaymentAndEarning() → payments.status='success' immédiatement
                         → host_earnings créés immédiatement
```

### Après (NotchPay) :
```
createPendingPaymentForNotchPay() → payments.status='pending'
                                  → host_earnings créés APRÈS webhook
Webhook NotchPay → Update payments.status
               → Update bookings/visits
               → Créer host_earnings si success
```

---

## ✨ Cas d'usage avancés

### Retry après échec :
- Créer nouveau payment row (nouvelle idempotency_key)
- Appeler edge function init à nouveau
- Polling recommence

### Paiements abandonnés :
- Booking/Visite restent en DB avec payment_status='pending'
- Permet relance ultérieure

### Split payment (bookings ≥ 8 nuits) :
- Paiement dépôt : purpose='booking'
- Paiement remaining : purpose='booking_remaining'
- Deux payments séparés, deux webhooks

---

## 📝 Checklist Implémentation

- [ ] Créer edge function `notchpay_init_payment`
- [ ] Créer edge function `notchpay_webhook`
- [ ] Ajouter env vars Notch Pay
- [ ] Tester signature webhook
- [ ] Tester flow complet (booking + paiement)
- [ ] Tester flow visite
- [ ] Tester retry après échec
- [ ] Tester split payment
- [ ] Tester webhook pour tous les statuts (success, failed, processing)

---

## 🆘 Support

**Fichiers app créés :**
- `src/lib/services/notchpay.ts`
- `src/hooks/usePaymentPolling.ts`
- `src/features/bookings/services/notchpay.ts`
- `src/features/rental-visits/services-notchpay.ts`

**À faire côté app :**
- Intégrer Modal de paiement avec les hooks
- Remplacer l'ancien `createPaymentAndEarning()` par le nouveau flux
- Tester polling + webhook

---

**Version :** 1.0  
**Date :** Jan 13, 2026  
**Status :** Prêt pour implémentation backend
