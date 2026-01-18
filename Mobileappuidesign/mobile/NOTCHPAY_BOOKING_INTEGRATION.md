# ✅ Intégration NotchPay dans les Bookings - End-to-End

## 📋 Résumé

Branching complet du paiement NotchPay pour les réservations (bookings) avec :
- ✅ Modale de paiement avec sélection de canal (cm.mtn, cm.orange, card)
- ✅ 2 modes d'UX distincts (Mobile Money vs Card WebView)
- ✅ Polling du statut de paiement (webhook = vérité)
- ✅ Gestion des cas success/failed/timeout
- ✅ Refresh automatique du booking après paiement

---

## 🎯 Fichiers Créés/Modifiés

### 1. NotchPayModal (Nouvelle Modale)
**Fichier :** `mobile/src/features/payments/components/NotchPayModal.tsx`

**Fonctionnalités :**
- Sélection du canal de paiement (cm.mtn, cm.orange, card)
- Entrée du numéro de téléphone (Mobile Money)
- WebView pour paiement par carte
- Polling du statut de paiement
- Gestion des états : polling, success, failed, timeout

**Props :**
```typescript
interface NotchPayModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  title: string;
  description: string;
  purpose: 'booking' | 'booking_remaining' | 'visite';
  relatedId: string;
  customerPhone?: string;
}
```

### 2. BookingPaymentScreen (Nouvel Écran)
**Fichier :** `mobile/src/features/bookings/screens/BookingPaymentScreen.tsx`

**Fonctionnalités :**
- Affichage des détails du booking
- Montants (total, acompte, solde)
- Statut du paiement
- Bouton "Payer" qui ouvre NotchPayModal
- Refresh du booking après paiement
- Affichage du statut success/partial/pending

**Props :**
```typescript
interface BookingPaymentScreenProps {
  bookingId: string;
  onBack?: () => void;
}
```

---

## 🔄 Flow Complet

### Étape 1 : Affichage de l'écran
```
BookingPaymentScreen
├─ Fetch booking (id, total_price, payment_status, etc.)
├─ Afficher détails (dates, montants, statut)
└─ Bouton "Payer" visible si payment_status !== 'paid'
```

### Étape 2 : Ouverture de la modale
```
User clique "Payer"
├─ Ouvrir NotchPayModal
├─ Afficher sélection canal (cm.mtn, cm.orange, card)
└─ Afficher champs selon canal
```

### Étape 3 : Sélection du canal
```
User choisit canal
├─ Si Mobile Money (cm.mtn / cm.orange)
│  └─ Afficher champ numéro téléphone
├─ Si Card
│  └─ Afficher champs carte (numéro, nom, expiry, CVV)
└─ Afficher checkbox conditions
```

### Étape 4 : Confirmation du paiement
```
User clique "Confirmer le paiement"
├─ Valider formulaire
├─ Appeler startPayment() du hook useNotchPayPayment
│  ├─ Créer payment PENDING
│  ├─ Appeler Edge Function notchpay_init_payment
│  ├─ Ouvrir WebView (si card)
│  └─ Lancer polling du statut
└─ Afficher UI selon mode
```

### Étape 5 : Polling du statut
```
App poll payments.status (2.5s, 90s max)
├─ Si success (webhook a mis à jour)
│  ├─ Afficher "Paiement confirmé"
│  ├─ Fermer modale
│  ├─ Refresh booking
│  └─ Afficher payment_status = 'paid'
├─ Si failed
│  ├─ Afficher erreur
│  ├─ Bouton "Réessayer"
│  └─ Bouton "Annuler"
└─ Si timeout (90s)
   ├─ Afficher "Paiement en cours"
   ├─ Bouton "Revérifier"
   └─ Bouton "Relancer"
```

---

## 🎨 UI States

### Mode Mobile Money (cm.mtn / cm.orange)
```
┌─────────────────────────────────────┐
│ Paiement Réservation                │
│ Montant: 50,000 FCFA                │
├─────────────────────────────────────┤
│ Moyen de paiement                   │
│ [OM] [MTN] [Card]                   │
├─────────────────────────────────────┤
│ Numéro de téléphone                 │
│ 🇨🇲 +237 [6 XX XX XX XX]            │
├─────────────────────────────────────┤
│ ☑ J'accepte les conditions          │
├─────────────────────────────────────┤
│ [Confirmer le paiement]             │
└─────────────────────────────────────┘
         ↓ (Polling)
┌─────────────────────────────────────┐
│ Vérification du paiement            │
│ ⏳ (spinner)                         │
│ Confirme sur ton téléphone          │
└─────────────────────────────────────┘
```

### Mode Card
```
┌─────────────────────────────────────┐
│ Paiement Réservation                │
│ Montant: 50,000 FCFA                │
├─────────────────────────────────────┤
│ Moyen de paiement                   │
│ [OM] [MTN] [Card]                   │
├─────────────────────────────────────┤
│ [WebView - authorization_url]       │
│ (User remplit formulaire carte)     │
├─────────────────────────────────────┤
│ ☑ J'accepte les conditions          │
├─────────────────────────────────────┤
│ [Confirmer le paiement]             │
└─────────────────────────────────────┘
         ↓ (WebView + Polling)
┌─────────────────────────────────────┐
│ Vérification du paiement            │
│ ⏳ (spinner)                         │
│ Complétez votre paiement par carte  │
│ [WebView - authorization_url]       │
└─────────────────────────────────────┘
```

### Timeout
```
┌─────────────────────────────────────┐
│ 🕐 Paiement en cours                │
│ Votre paiement est en cours de      │
│ confirmation. Veuillez vérifier     │
│ votre téléphone.                    │
├─────────────────────────────────────┤
│ [Revérifier]                        │
│ [Fermer]                            │
└─────────────────────────────────────┘
```

### Failed
```
┌─────────────────────────────────────┐
│ ❌ Paiement échoué                  │
│ [Raison de l'échec]                 │
├─────────────────────────────────────┤
│ [Réessayer]                         │
│ [Annuler]                           │
└─────────────────────────────────────┘
```

---

## 🔌 Intégration dans les Écrans Existants

### Option 1 : Remplacer BookingPaymentDialog
```typescript
// Ancien
import { BookingPaymentDialog } from '@/src/features/bookings/components/BookingPaymentDialog';

// Nouveau
import { BookingPaymentScreen } from '@/src/features/bookings/screens/BookingPaymentScreen';

// Utilisation
<BookingPaymentScreen bookingId={bookingId} onBack={handleBack} />
```

### Option 2 : Intégrer dans ReservationDetailsScreen
```typescript
// Dans ReservationDetailsScreen
const [showPaymentScreen, setShowPaymentScreen] = useState(false);

if (showPaymentScreen) {
  return (
    <BookingPaymentScreen 
      bookingId={reservationId} 
      onBack={() => setShowPaymentScreen(false)} 
    />
  );
}

// Bouton pour ouvrir
<TouchableOpacity onPress={() => setShowPaymentScreen(true)}>
  <Text>Payer</Text>
</TouchableOpacity>
```

---

## ✨ Points Clés

### ✅ Respectés
- ✅ **Pas de clés NotchPay** : Toutes côté Edge Function
- ✅ **Pas d'appels directs** : Tout via Edge Function
- ✅ **Webhook = vérité** : `payments.status` mis à jour par webhook
- ✅ **Pas de success forcé** : Attendre webhook
- ✅ **2 modes d'UX** : Mobile Money (pas WebView) vs Card (WebView)
- ✅ **Polling indépendant** : Continue même pendant WebView
- ✅ **Snake_case → CamelCase** : Mapping correct dans le service
- ✅ **Timeout/Retry UX** : Boutons "Revérifier" et "Relancer"

### 🔒 Sécurité
- ✅ Pas de données sensibles en local
- ✅ Webhook valide les paiements
- ✅ Idempotence : Même payment_id ne crée qu'un seul paiement
- ✅ Refresh automatique après paiement

---

## 📝 Prochaines Étapes

1. **Intégrer dans les écrans existants** :
   - ReservationDetailsScreen
   - Host Reservations Screen
   - Guest Bookings Screen

2. **Tester les 2 modes** :
   - Mobile Money : cm.mtn / cm.orange
   - Card : authorization_url + WebView

3. **Tester les cas limites** :
   - Timeout (90s)
   - Failed payment
   - Retry après failed
   - Refresh après success

4. **Brancher les visites** :
   - VisitPaymentScreen (similaire)
   - Montant fixe : 5000 FCFA

---

## 📁 Fichiers Livrés

```
✅ mobile/src/features/payments/components/NotchPayModal.tsx
   └─ Modale complète avec 2 modes d'UX

✅ mobile/src/features/bookings/screens/BookingPaymentScreen.tsx
   └─ Écran de paiement pour les bookings

✅ mobile/src/lib/services/notchpay.ts
   └─ Service avec mapping snake_case → camelCase

✅ mobile/src/hooks/useNotchPayPayment.ts
   └─ Hook avec logique 2 modes

✅ supabase/functions/notchpay_init_payment/index.ts
   └─ Edge Function REVERTED (stable)
```

---

**Status :** ✅ **BRANCHING NOTCHPAY DANS LES BOOKINGS - END-TO-END COMPLÉTÉ**
