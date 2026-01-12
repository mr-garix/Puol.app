# 📱 Documentation des Notifications In-App et Push

## 🎯 Vue d'ensemble

Ce document liste toutes les notifications in-app actuelles et les structures de données nécessaires pour les nouvelles notifications (in-app et push).

---

## ✅ NOTIFICATIONS IN-APP ACTUELLES

### 1. **Nouvelle Réservation (Host)**
- **Bridge**: `HostBookingNotificationBridge.tsx`
- **Titre**: `Nouvelle réservation 🎉`
- **Message**: `{guestName} a réservé {listingTitle} • {stayRange}`
- **Route**: `/host-reservations/{bookingId}`
- **Déclencheur**: INSERT dans `bookings` (nouveau booking)
- **Condition**: Utilisateur connecté
- **Tables utilisées**: `bookings`, `listings`, `profiles`

### 2. **Réservation Annulée (Host)**
- **Bridge**: `HostBookingNotificationBridge.tsx` / `GuestCancellationNotificationBridge.tsx`
- **Titre**: `Réservation annulée`
- **Message**: `{guestName} a annulé sa réservation pour "{listingTitle}"`
- **Route**: `/host-reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.status` → `cancelled`
- **Condition**: Utilisateur connecté
- **Tables utilisées**: `bookings`, `listings`, `profiles`

### 3. **Nouveau Commentaire (Host)**
- **Bridge**: `HostCommentNotificationBridge.tsx`
- **Titre**: `Nouveau commentaire • {listingTitle}` ou `Nouvelle réponse • {listingTitle}`
- **Message**: `{authorName}: {contentSnippet}`
- **Route**: `/host-comments`
- **Déclencheur**: INSERT dans `listing_comments`
- **Condition**: Utilisateur connecté, commentaire sur son annonce
- **Tables utilisées**: `listing_comments`, `listings`, `profiles`

### 4. **Nouveau Commentaire (User/Guest)**
- **Bridge**: `UserCommentNotificationBridge.tsx`
- **Titre**: `Nouveau commentaire • {listingTitle}`
- **Message**: `{authorName}: {contentSnippet}`
- **Route**: `/property/{listingId}`
- **Déclencheur**: INSERT dans `listing_comments`
- **Condition**: Utilisateur connecté, commentaire sur annonce visitée
- **Tables utilisées**: `listing_comments`, `listings`, `profiles`

### 5. **Nouvel Avis (Host)**
- **Bridge**: `HostReviewNotificationBridge.tsx`
- **Titre**: `Nouvel avis reçu • {listingTitle}`
- **Message**: `{authorName} a laissé {rating}/5 • "{reviewSnippet}"`
- **Route**: `/host-reviews`
- **Déclencheur**: INSERT dans `reviews` (rating > 0)
- **Condition**: Utilisateur connecté, avis sur son annonce
- **Tables utilisées**: `reviews`, `listings`, `profiles`

### 6. **Réponse à Avis (Guest)**
- **Bridge**: `UserReviewReplyNotificationBridge.tsx`
- **Titre**: `Nouvelle réponse d'hôte • {listingTitle}`
- **Message**: `"{replySnippet}"` ou `Votre hôte a répondu à votre avis`
- **Route**: `/property/{listingId}/reviews`
- **Déclencheur**: UPDATE `reviews.owner_reply` (ajout/modification)
- **Condition**: Utilisateur connecté, avis écrit par lui
- **Tables utilisées**: `reviews`, `listings`, `profiles`

### 7. **Visite Confirmée (Host)**
- **Bridge**: `HostVisitNotificationBridge.tsx`
- **Titre**: `Nouvelle visite confirmée`
- **Message**: `{visitorName} a confirmé sa visite pour {listingTitle}`
- **Route**: `/host-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté
- **Tables utilisées**: `rental_visits`, `listings`, `profiles`

### 8. **Visite Confirmée (Guest/Landlord)**
- **Bridge**: `VisitNotificationBridge.tsx`
- **Titre**: `Visite confirmée`
- **Message**: `Votre visite pour {listingTitle} est confirmée`
- **Route**: `/visits/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté
- **Tables utilisées**: `rental_visits`, `listings`, `profiles`

### 9. **Visite Confirmée (Landlord)**
- **Bridge**: `LandlordVisitNotificationBridge.tsx`
- **Titre**: `Nouvelle visite confirmée`
- **Message**: `{visitorName} a confirmé sa visite pour {listingTitle}`
- **Route**: `/landlord-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté (landlord)
- **Tables utilisées**: `rental_visits`, `listings`, `profiles`

### 10. **Statut Application (Host/Landlord)**
- **Bridge**: `ApplicationStatusNotificationBridge.tsx`
- **Titre**: `Demande approuvée` ou `Demande rejetée`
- **Message**: Dépend du type d'application
- **Route**: `/host` ou `/landlord`
- **Déclencheur**: UPDATE `host_applications.status` ou `landlord_applications.status`
- **Condition**: Utilisateur connecté
- **Tables utilisées**: `host_applications`, `landlord_applications`

---

## 🆕 NOUVELLES NOTIFICATIONS À IMPLÉMENTER

### 1. **Nouvel Abonnement au Profil**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Nouvel abonné 👥`
- **Message**: `{followerName} s'est abonné à votre profil`
- **Route**: `/profile/{followerId}`
- **Déclencheur**: INSERT dans `profile_follows`
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: profile_follows (déjà existante)
  - id (UUID)
  - follower_id (TEXT) → profiles.id
  - following_id (TEXT) → profiles.id
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  ```
- **Broadcast Channel**: `profile-follow-notifications-{followingId}`
- **Conditions**:
  - Ne pas notifier si follower_id === following_id
  - Ne pas notifier si l'utilisateur est déjà abonné

---

### 2. **Avis Écrit sur Profil (Host)**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Nouvel avis reçu 🌟`
- **Message**: `{authorName} a laissé {rating}/5 • "{reviewSnippet}"`
- **Route**: `/host-reviews` ou `/profile/{authorId}`
- **Déclencheur**: INSERT dans `reviews` (rating > 0, sur profil host)
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: reviews (déjà existante)
  - id (UUID)
  - author_id (TEXT) → profiles.id
  - listing_id (UUID) → listings.id (peut être NULL pour avis profil)
  - rating (INTEGER) 1-5
  - comment (TEXT)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  
  -- Ajouter colonne si nécessaire:
  - reviewed_profile_id (TEXT) → profiles.id (pour avis profil)
  ```
- **Broadcast Channel**: `profile-review-notifications-{reviewedProfileId}`

---

### 3. **Remboursement Traité**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Remboursement traité ✅`
- **Message**: `Votre remboursement de {amount} {currency} a été traité`
- **Route**: `/reservations/{bookingId}` ou `/host-reservations/{bookingId}`
- **Déclencheur**: UPDATE `refunds.status` → `completed`
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: refunds (déjà existante)
  - id (UUID)
  - booking_id (UUID) → bookings.id
  - guest_profile_id (TEXT) → profiles.id
  - host_profile_id (TEXT) → profiles.id
  - amount (NUMERIC)
  - currency (TEXT)
  - status (TEXT) ['pending', 'processing', 'completed', 'failed']
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - processed_at (TIMESTAMP)
  ```
- **Broadcast Channel**: `refund-notifications-{guestProfileId}`

---

### 4. **Annulation de Visite**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Visite annulée ❌`
- **Message**: `{visitorName} a annulé sa visite pour {listingTitle}`
- **Route**: `/host-visit/{visitId}` ou `/landlord-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `cancelled`
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: rental_visits (déjà existante)
  - id (UUID)
  - listing_id (UUID) → listings.id
  - visitor_profile_id (TEXT) → profiles.id
  - host_profile_id (TEXT) → profiles.id
  - status (TEXT) ['scheduled', 'confirmed', 'completed', 'cancelled']
  - scheduled_at (TIMESTAMP)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  ```
- **Broadcast Channel**: `visit-cancellation-notifications-{hostProfileId}`

---

### 5. **Annulation de Réservation (Guest)**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Réservation annulée ❌`
- **Message**: `Votre réservation pour {listingTitle} a été annulée`
- **Route**: `/reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.status` → `cancelled` (par host)
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: bookings (déjà existante)
  - id (UUID)
  - guest_profile_id (TEXT) → profiles.id
  - listing_id (UUID) → listings.id
  - status (TEXT)
  - cancelled_by (TEXT) ['guest', 'host', 'system']
  - cancellation_reason (TEXT)
  - cancelled_at (TIMESTAMP)
  ```
- **Broadcast Channel**: `booking-cancellation-notifications-{guestProfileId}`

---

### 6. **Demande de Paiement Restant**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Paiement demandé 💳`
- **Message**: `Paiement restant de {amount} {currency} demandé pour {listingTitle}`
- **Route**: `/reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.remaining_payment_status` → `requested`
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: bookings (déjà existante)
  - remaining_payment_status (TEXT) ['pending', 'requested', 'paid', 'overdue']
  - remaining_amount (NUMERIC)
  - currency (TEXT)
  ```
- **Broadcast Channel**: `payment-request-notifications-{guestProfileId}`

---

### 7. **Message Reçu**
**Type**: In-app + Push (si déconnecté)

- **Titre**: `Nouveau message 💬`
- **Message**: `{senderName}: {messageSnippet}`
- **Route**: `/messages/{conversationId}`
- **Déclencheur**: INSERT dans `listing_messages`
- **Tables/Colonnes nécessaires**:
  ```sql
  -- Table: listing_messages (déjà existante)
  - id (UUID)
  - conversation_id (UUID) → listing_conversations.id
  - sender_id (TEXT) → profiles.id
  - recipient_id (TEXT) → profiles.id
  - content (TEXT)
  - created_at (TIMESTAMP)
  
  -- Table: listing_conversations (déjà existante)
  - id (UUID)
  - listing_id (UUID) → listings.id
  - participant_1_id (TEXT) → profiles.id
  - participant_2_id (TEXT) → profiles.id
  ```
- **Broadcast Channel**: `message-notifications-{recipientId}`

---

## 📊 RÉSUMÉ DES TABLES ET COLONNES

### Tables existantes à utiliser:
1. **bookings** - Réservations
   - `id`, `guest_profile_id`, `host_id`, `listing_id`, `status`, `checkin_date`, `checkout_date`
   - À ajouter: `cancelled_by`, `cancellation_reason`, `cancelled_at`

2. **reviews** - Avis
   - `id`, `author_id`, `listing_id`, `rating`, `comment`, `owner_reply`, `created_at`
   - À ajouter: `reviewed_profile_id` (pour avis profil)

3. **listing_comments** - Commentaires
   - `id`, `listing_id`, `profile_id`, `content`, `created_at`

4. **rental_visits** - Visites
   - `id`, `listing_id`, `visitor_profile_id`, `host_profile_id`, `status`, `scheduled_at`
   - À ajouter: `cancelled_by`, `cancellation_reason`, `cancelled_at`

5. **profile_follows** - Abonnements profil
   - `id`, `follower_id`, `following_id`, `created_at`

6. **refunds** - Remboursements
   - `id`, `booking_id`, `guest_profile_id`, `host_profile_id`, `amount`, `currency`, `status`, `processed_at`

7. **listing_messages** - Messages
   - `id`, `conversation_id`, `sender_id`, `recipient_id`, `content`, `created_at`

8. **listing_conversations** - Conversations
   - `id`, `listing_id`, `participant_1_id`, `participant_2_id`

---

## 🔧 ARCHITECTURE DES NOTIFICATIONS

### Flux In-App (Utilisateur connecté):
```
Event (DB) → Realtime Subscription → NotificationBridge → showNotification() → NotificationHost → NotificationBanner
```

### Flux Push (Utilisateur déconnecté):
```
Event (DB) → Edge Function → OneSignal API → Push Notification
```

### Broadcast Channels (Temps réel):
```
Backend/Edge Function → supabase.channel().broadcast() → NotificationBridge → showNotification()
```

---

## 📝 Checklist d'implémentation

Pour chaque nouvelle notification:

- [ ] Créer `{Type}NotificationBridge.tsx` dans `/src/infrastructure/notifications/`
- [ ] Ajouter le bridge dans `app/_layout.tsx`
- [ ] Implémenter la souscription Realtime (postgres_changes ou broadcast)
- [ ] Implémenter la logique de cache (AsyncStorage)
- [ ] Définir la route de navigation
- [ ] Créer/mettre à jour l'Edge Function pour les push notifications
- [ ] Tester in-app (connecté) et push (déconnecté)
- [ ] Documenter les colonnes DB nécessaires

---

## 🚀 Prochaines étapes

1. **Implémenter les 7 nouvelles notifications** (profil follow, avis profil, remboursement, etc.)
2. **Créer les Edge Functions** pour les push notifications
3. **Ajouter les colonnes manquantes** aux tables existantes
4. **Tester** chaque notification en in-app et push
5. **Documenter** les triggers et les conditions de chaque notification
