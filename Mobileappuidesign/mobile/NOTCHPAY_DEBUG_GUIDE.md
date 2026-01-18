# 🔧 Guide de Débogage NotchPay - Format Téléphone Corrigé

## ✅ Corrections Apportées

### 1. Format du Numéro de Téléphone
**Problème :** NotchPay recevait le téléphone au format `+237690123456` ou `+237 690 123 456`
**Solution :** Envoyer juste les 9 derniers chiffres : `690123456`

**Fichiers modifiés :**
- `PaymentModal.tsx` ligne 221 : Normalisation avant appel hook
- `useNotchPayPayment.ts` ligne 117 : Normalisation avant appel Edge Function

```typescript
// Normalisation correcte
const normalizedPhone = customerPhone.replace(/\D/g, '').slice(-9);
// Exemple: "+237690123456" → "690123456"
```

### 2. Logs Améliorés dans Edge Function
**Fichier :** `notchpay_init_payment/index.ts` ligne 137-158

Maintenant affiche :
- Réponse complète de NotchPay (JSON)
- HTTP status code
- Détails de l'erreur si échec

---

## 🧪 Étapes de Test

### Test 1 : Vérifier le Format du Téléphone
1. Ouvre les logs de l'app (console)
2. Cherche : `[PaymentModal] 📞 Téléphone normalisé:`
3. Vérifie que le téléphone normalisé est au format `690123456` (9 chiffres)

### Test 2 : Vérifier l'Appel Edge Function
1. Ouvre les logs Supabase (Edge Function logs)
2. Cherche : `[notchpay_init_payment] 📤 Appel NotchPay API avec payload:`
3. Vérifie que le payload contient :
   - `phone: "690123456"` (9 chiffres, pas de +)
   - `amount: XXXX` (montant correct)
   - `currency: "XAF"`
   - `locked_channel: "cm.mtn"` ou `"cm.orange"` ou `"card"`

### Test 3 : Vérifier la Réponse NotchPay
1. Cherche : `[notchpay_init_payment] 📥 Réponse NotchPay complète:`
2. Regarde la réponse JSON complète
3. Cherche : `[notchpay_init_payment] 📥 Réponse NotchPay:`
4. Vérifie :
   - `status: true` (succès) ou `false` (erreur)
   - `message: "..."` (message d'erreur si échec)
   - `hasReference: true` (transaction créée)
   - `hasAuthUrl: true` (pour les cartes)

---

## 🐛 Erreurs Possibles et Solutions

### Erreur 1 : "Invalid phone number"
**Cause :** Format du téléphone incorrect
**Solution :** Vérifier que le téléphone est au format `690123456` (9 chiffres)

### Erreur 2 : "Invalid amount"
**Cause :** Montant incorrect ou format invalide
**Solution :** Vérifier que le montant est un nombre entier (ex: 5000, pas "5000 FCFA")

### Erreur 3 : "Invalid currency"
**Cause :** Devise non supportée
**Solution :** Vérifier que la devise est `"XAF"` (Franc CFA)

### Erreur 4 : "Invalid locked_channel"
**Cause :** Canal de paiement invalide
**Solution :** Vérifier que le canal est `"cm.mtn"`, `"cm.orange"`, ou `"card"`

### Erreur 5 : "Authentication failed"
**Cause :** Clés API NotchPay incorrectes
**Solution :** Vérifier les variables d'environnement Supabase :
- `NOTCHPAY_PUBLIC_KEY`
- `NOTCHPAY_PRIVATE_KEY`

---

## 📊 Flow Complet avec Logs

```
User clique "Valider votre réservation"
    ↓
[PaymentModal] Validation du formulaire
    ↓
[PaymentModal] 📞 Téléphone normalisé: {original, normalized}
    ↓
[useNotchPayPayment] 🚀 Démarrage du paiement NotchPay
    ↓
[useNotchPayPayment] ✅ Payment créé: {payment.id}
    ↓
[useNotchPayPayment] 📞 Téléphone normalisé: {original, normalized}
    ↓
[notchpay_init_payment] 🔵 Requête reçue: {payment_id, amount, phone, locked_channel}
    ↓
[notchpay_init_payment] 📤 Appel NotchPay API avec payload: {cleanPayload}
    ↓
[notchpay_init_payment] 📥 Réponse NotchPay complète: {JSON}
    ↓
[notchpay_init_payment] 📥 Réponse NotchPay: {status, message, hasReference, hasAuthUrl}
    ↓
SI status=true:
  [notchpay_init_payment] ✅ NotchPay initialisé: {reference, hasAuthUrl}
  [useNotchPayPayment] ✅ NotchPay initialisé: {reference, hasUrl, channel}
  [PaymentModal] Affiche "Vérification du paiement"
  
SI status=false:
  [notchpay_init_payment] ❌ Erreur NotchPay: {message, fullResponse, httpStatus}
  [PaymentModal] Affiche "Paiement échoué"
```

---

## 🔍 Commandes Utiles

### Vérifier les logs Supabase
```bash
# Dans Supabase Dashboard → Edge Functions → notchpay_init_payment → Logs
# Chercher les timestamps récents et les messages d'erreur
```

### Vérifier les logs App
```bash
# Dans React Native Debugger ou Expo Logs
# Chercher les messages [PaymentModal] et [useNotchPayPayment]
```

---

## ✨ Résumé

Les corrections apportées devraient résoudre le problème d'erreur NotchPay. Si tu vois toujours "failed", partage-moi :

1. **Le message d'erreur exact** de NotchPay (depuis les logs Edge Function)
2. **Le numéro de téléphone** que tu utilises pour tester
3. **Le montant** du paiement
4. **Le canal** sélectionné (MTN, Orange, ou Carte)

Cela m'aidera à identifier le problème exact et à le corriger rapidement.
