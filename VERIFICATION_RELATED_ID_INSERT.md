# Vérification : related_id EST Inséré Directement au Moment de la Création du Paiement

## ✅ CONFIRMATION : Le Code Insère related_id Directement

### 1. Flux pour un BOOKING

**Étape 1 : Créer le booking**
```typescript
// mobile/src/features/bookings/services/notchpay.ts:43-119
export const createBookingWithNotchPaySimplified = async (input) => {
  // ... crée un booking ...
  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('*')
    .single();
  
  return { id: data.id, ... };  // ← Retourne booking.id (UUID)
};
```

**Étape 2 : Créer le payment avec related_id = booking.id**
```typescript
// mobile/src/features/bookings/services/notchpay.ts:125-186
export const initBookingPaymentWithNotchPay = async (params: {
  bookingId: string,  // ← C'EST LE booking.id
  ...
}) => {
  // 1. Créer payment PENDING
  const { payment } = await createPendingPaymentForNotchPay({
    payerProfileId: guestProfileId,
    purpose: 'booking',
    relatedId: bookingId,  // ← PASSE LE booking.id
    amount: totalPrice,
    channel,
    customerPrice: totalPrice,
  });
};
```

**Étape 3 : Insérer le payment avec related_id**
```typescript
// mobile/src/lib/services/notchpay.ts:46-151
export const createPendingPaymentForNotchPay = async (params: {
  relatedId: string,  // ← C'EST LE booking.id OU visit.id
  ...
}) => {
  // Créer le paiement en status PENDING
  const paymentPayload: PaymentInsert = {
    payer_profile_id: payerProfileId,
    purpose,
    related_id: relatedId,  // ← ✅ INSÉRÉ DIRECTEMENT
    amount,
    currency,
    provider: 'notchpay',
    provider_channel: channel,
    status: 'pending',
    idempotency_key: idempotencyKey,
    provider_reference: null,
    provider_payment_url: null,
    raw_provider_payload: null,
    failure_reason: null,
    client_payload: customerPrice ? { customerPrice } : null,
    paid_at: null,
  };

  console.log('[createPendingPaymentForNotchPay] 💳 Payload paiement:', paymentPayload);

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert(paymentPayload)  // ← ✅ INSERT AVEC related_id
    .select()
    .single();

  if (paymentError) {
    console.error('[createPendingPaymentForNotchPay] ❌ Erreur création paiement:', paymentError);
    throw paymentError;
  }

  console.log('[createPendingPaymentForNotchPay] ✅ Paiement créé:', {
    id: payment?.id,
    status: payment?.status,
    purpose: payment?.purpose,
    related_id: payment?.related_id,  // ← ✅ VÉRIFICATION
  });

  // ✅ VÉRIFICATION: related_id DOIT être présent
  if (!payment?.related_id) {
    console.error('[createPendingPaymentForNotchPay] ❌ ERREUR: related_id est NULL ou undefined!');
    console.error('[createPendingPaymentForNotchPay] Paiement complet:', payment);
  } else {
    console.log('[createPendingPaymentForNotchPay] ✅ related_id inséré correctement:', payment.related_id);
  }

  return { payment, idempotencyKey };
};
```

### 2. Flux pour une VISITE

**Même flux :**
```typescript
// mobile/src/features/rental-visits/services-notchpay.ts:29-100
export const createRentalVisitWithNotchPay = async (input) => {
  // ... crée une visite ...
  return { id: data.id, ... };  // ← Retourne visit.id (UUID)
};

// mobile/src/features/rental-visits/services-notchpay.ts:106-164
export const initVisitPaymentWithNotchPay = async (params: {
  visitId: string,  // ← C'EST LE visit.id
  ...
}) => {
  const { payment } = await createPendingPaymentForNotchPay({
    payerProfileId: guestProfileId,
    purpose: 'visite',
    relatedId: visitId,  // ← PASSE LE visit.id
    amount: VISIT_AMOUNT,
    channel,
  });
};
```

---

## 🔍 DIAGNOSTIC : Pourquoi related_id n'est pas inséré en base ?

### Possible Raison 1 : Problème RLS (Row Level Security)

**Migration actuelle :** `20250116_fix_payment_related_id_rls.sql`

La politique RLS permet l'insertion, mais peut-être que `related_id` n'est pas explicitement autorisé.

**Solution :** Vérifier que la politique RLS n'empêche pas l'insertion de `related_id`

### Possible Raison 2 : Type UUID vs TEXT

**Migration actuelle :** `20250116_fix_payment_related_id_rls.sql` ajoute `related_id` en **TEXT**

Mais tu as changé le type en **UUID** dans Supabase.

**Solution :** Convertir `related_id` de TEXT en UUID

### Possible Raison 3 : Colonne related_id n'existe pas ou est NOT NULL

**Solution :** Vérifier que la colonne existe et est nullable

---

## ✅ SOLUTION : Déployer la Migration

**Fichier créé :** `20250118_ensure_related_id_insert.sql`

**Actions :**
1. Convertit `related_id` de TEXT en UUID
2. Corrige les politiques RLS
3. Vérifie que tout est correct

**À exécuter :**
```bash
cd c:\Users\Alex Emmanuel\Desktop\PUOL\Mobileappuidesign
supabase migrations deploy 20250118_ensure_related_id_insert.sql
```

---

## 📊 Résumé du Flux Correct

```
1️⃣ CRÉER BOOKING/VISITE
   └─ booking.id OU visit.id généré (UUID)

2️⃣ CRÉER PAYMENT
   └─ related_id = booking.id OU visit.id
   └─ ✅ INSÉRÉ DIRECTEMENT DANS LE PAYLOAD
   └─ status = 'pending'

3️⃣ WEBHOOK NOTCHPAY ARRIVE
   └─ Confirme le paiement
   └─ UPDATE payments.status = 'success'
   └─ related_id RESTE INCHANGÉ

4️⃣ TRIGGER CRÉE HOST_EARNINGS/PAYOUTS
   └─ Récupère related_id du payment
   └─ Cherche booking/visite via related_id
   └─ Crée host_earnings avec related_id copié
```

---

## ✅ VÉRIFICATION FINALE

**Logs à vérifier après déploiement :**

```
[createPendingPaymentForNotchPay] 💳 Payload paiement: { 
  related_id: 'uuid-du-booking', 
  purpose: 'booking', 
  status: 'pending',
  ...
}

[createPendingPaymentForNotchPay] ✅ Paiement créé: { 
  id: 'payment-uuid', 
  related_id: 'uuid-du-booking',  ← ✅ PRÉSENT
  status: 'pending',
  purpose: 'booking'
}

[createPendingPaymentForNotchPay] ✅ related_id inséré correctement: uuid-du-booking
```

**Si tu vois :**
```
[createPendingPaymentForNotchPay] ❌ ERREUR: related_id est NULL ou undefined!
```

**Alors :** Il y a un problème RLS ou de type UUID qui empêche l'insertion.

---

## 🎯 Conclusion

**Le code EST correct :** `related_id` EST inséré directement lors de la création du paiement.

**Si related_id est NULL en base :** C'est un problème RLS ou de type de colonne, pas un problème de code.

**À faire :**
1. Déployer `20250118_ensure_related_id_insert.sql`
2. Tester la création d'un paiement
3. Vérifier les logs
4. Vérifier que `related_id` est présent dans la table `payments`
