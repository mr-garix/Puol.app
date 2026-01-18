# 🚨 NOTCHPAY FIX CRITIQUE - V1 SUPPRIMÉ

## ❌ Problèmes Identifiés

### 1. Code V1 qui force les paiements à `success`
**Fichier :** `mobile/src/lib/services/payments.ts` ligne 106
```typescript
// ❌ AVANT (V1 - SUPPRIMÉ)
status: 'success', // V1 : on considère le paiement comme réussi
paid_at: new Date().toISOString(),

// ✅ APRÈS (NotchPay)
status: 'pending', // webhook mettra à jour
paid_at: null, // webhook mettra à jour
```

### 2. Code V1 qui force les bookings à `paid`
**Fichier :** `mobile/src/features/bookings/services/index.ts`
```typescript
// ❌ JAMAIS appeler côté app
export const markBookingPaid = async (bookingId: string) => {
  // Force payment_status = 'paid' SANS webhook
  // À SUPPRIMER ou DÉSACTIVER
}
```

### 3. PaymentModal existante qui ne branchait pas NotchPay
**Fichier :** `mobile/src/features/payments/components/PaymentModal.tsx`
```typescript
// ❌ AVANT: Simulait un délai et forçait onSuccess
await new Promise(resolve => setTimeout(resolve, 2000));
await onSuccess(paymentMethod);

// ✅ APRÈS: Appelle le vrai hook NotchPayPayment
const { startPayment } = useNotchPayPayment({...});
await startPayment({...});
```

---

## ✅ Corrections Apportées

### 1. Changement dans `payments.ts`
- ✅ `status: 'pending'` au lieu de `'success'`
- ✅ `paid_at: null` au lieu de `now()`
- ✅ Webhook mettra à jour ces champs

### 2. Remplacement de PaymentModal
- ✅ Nouvelle version branche le hook `useNotchPayPayment`
- ✅ Gère les 2 modes: Mobile Money (pas WebView) et Card (WebView)
- ✅ Polling du statut (webhook = vérité)
- ✅ Gestion success/failed/timeout

### 3. Fichiers renommés
```
PaymentModal.tsx (OLD) → PaymentModal.OLD.tsx
PaymentModal.NotchPay.tsx → PaymentModal.tsx
```

---

## 🔄 Vrai Flow NotchPay (CORRECT)

### Étape 1: User clique "Payer"
```
User → Bouton "Payer" → Ouvre PaymentModal
```

### Étape 2: PaymentModal branchée
```
PaymentModal
├─ Sélectionner canal (cm.mtn, cm.orange, card)
├─ Entrer numéro téléphone (Mobile Money)
├─ Clicker "Confirmer"
└─ Appelle startPayment() du hook useNotchPayPayment
```

### Étape 3: Hook NotchPayPayment
```
useNotchPayPayment.startPayment()
├─ 1) Appelle createPendingPaymentForNotchPay()
│  └─ INSERT payments (status='pending')
├─ 2) Appelle initNotchPayPayment()
│  └─ Edge Function notchpay_init_payment
│     ├─ POST /payments (init)
│     ├─ POST /payments/{provider_reference} (charge)
│     └─ Retour: { provider_reference, authorization_url }
├─ 3) Affiche UI selon mode
│  ├─ Mobile Money: "Confirme sur ton téléphone"
│  └─ Card: WebView avec authorization_url
└─ 4) Lance polling du statut
   └─ Poll payments.status (2.5s, 90s max)
```

### Étape 4: Webhook met à jour
```
NotchPay Webhook
├─ Paiement réussi
├─ PUT payments (status='success', paid_at=now())
├─ PUT bookings (payment_status='paid')
└─ App détecte success → Refresh booking
```

### Étape 5: App détecte success
```
Polling détecte payments.status='success'
├─ Affiche "Paiement confirmé"
├─ Ferme modale
├─ Refresh booking
└─ Affiche payment_status='paid'
```

---

## 🚫 Règles NON NÉGOCIABLES

| Règle | ❌ NE PAS FAIRE | ✅ À FAIRE |
|-------|-----------------|-----------|
| **Créer payment** | Forcer `status='success'` | Créer `status='pending'` |
| **Mettre à jour booking** | Forcer `payment_status='paid'` côté app | Attendre webhook |
| **Vérité** | Dépendre du redirect WebView | Webhook = vérité |
| **Edge Function** | Appeler directement NotchPay API | Tout via Edge Function |
| **Clés NotchPay** | Stocker dans l'app | Toutes côté Edge Function |

---

## 📋 Checklist Avant Test

- [ ] `payments.ts` ligne 106: `status: 'pending'` ✅
- [ ] `payments.ts` ligne 109: `paid_at: null` ✅
- [ ] `PaymentModal.tsx` branche `useNotchPayPayment` ✅
- [ ] `markBookingPaid()` n'est JAMAIS appelé côté app
- [ ] Edge Function `notchpay_init_payment` retourne `provider_reference` + `authorization_url`
- [ ] Webhook met à jour `payments.status='success'`
- [ ] Webhook met à jour `bookings.payment_status='paid'`

---

## 🧪 Test End-to-End

### Scénario 1: Mobile Money (cm.mtn)
```
1. User clique "Payer"
2. Sélectionne cm.mtn
3. Entre numéro téléphone
4. Clique "Confirmer"
5. App crée payment (pending)
6. App appelle Edge Function
7. Modale affiche "Confirme sur ton téléphone"
8. App poll payments.status
9. Webhook met à jour payments.status='success'
10. App détecte success → Refresh booking
11. booking.payment_status='paid' ✅
```

### Scénario 2: Card
```
1. User clique "Payer"
2. Sélectionne card
3. Clique "Confirmer"
4. App crée payment (pending)
5. App appelle Edge Function
6. Modale affiche WebView (authorization_url)
7. User remplit formulaire carte
8. User clique "Confirmer"
9. App continue polling (indépendant WebView)
10. Webhook met à jour payments.status='success'
11. App détecte success → Refresh booking
12. booking.payment_status='paid' ✅
```

### Preuves à Fournir
```
1. Log: Edge Function notchpay_init_payment appelée ✅
2. DB: payments row créée (pending) avec provider_reference ✅
3. DB: booking.payment_status='pending' (pas 'paid') ✅
4. Webhook: payments.status mis à jour à 'success' ✅
5. DB: booking.payment_status='paid' (après webhook) ✅
```

---

## 📁 Fichiers Modifiés

```
✅ mobile/src/lib/services/payments.ts
   - status: 'pending' (au lieu de 'success')
   - paid_at: null (au lieu de now())

✅ mobile/src/features/payments/components/PaymentModal.tsx
   - Remplacée par version NotchPay
   - Branche useNotchPayPayment
   - Gère 2 modes (Mobile Money vs Card)

⚠️ mobile/src/features/bookings/services/index.ts
   - markBookingPaid() existe mais NE DOIT PAS être appelée
   - À vérifier: aucun appel à markBookingPaid()

⚠️ mobile/src/features/payments/components/PaymentModal.OLD.tsx
   - Ancienne version (V1) - à supprimer après test
```

---

## 🔍 À Vérifier Immédiatement

1. **Chercher tous les appels à `markBookingPaid`**
   ```bash
   grep -r "markBookingPaid" mobile/src
   ```
   Résultat attendu: Aucun appel côté app

2. **Vérifier que `createPaymentAndEarning` n'est pas appelé**
   ```bash
   grep -r "createPaymentAndEarning" mobile/src
   ```
   Résultat attendu: Aucun appel côté app

3. **Vérifier que PaymentModal branche NotchPay**
   ```bash
   grep -r "useNotchPayPayment" mobile/src/features/payments
   ```
   Résultat attendu: PaymentModal.tsx utilise le hook

---

**Status :** 🚨 **CRITICAL FIX APPLIQUÉ - À TESTER IMMÉDIATEMENT**
