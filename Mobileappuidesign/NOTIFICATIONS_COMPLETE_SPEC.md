# 📱 Spécification Complète des Notifications In-App et Push

## 📋 Table des matières
1. [Notifications In-App Actuelles](#notifications-in-app-actuelles)
2. [Nouvelles Notifications à Implémenter](#nouvelles-notifications-à-implémenter)
3. [Architecture Technique](#architecture-technique)
4. [Requêtes SQL](#requêtes-sql)

---

# ✅ NOTIFICATIONS IN-APP ACTUELLES

## 1. Nouvelle Réservation (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host (propriétaire de l'annonce)
- **Titre**: `Nouvelle réservation 🎉`
- **Message**: `{guestName} a réservé {listingTitle} • {stayRange}`
- **Route de navigation**: `/host-reservations/{bookingId}`
- **Déclencheur**: INSERT dans `bookings`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: bookings
SELECT 
  b.id,
  b.guest_profile_id,
  b.listing_id,
  b.status,
  b.checkin_date,
  b.checkout_date,
  b.created_at
FROM bookings b
WHERE b.id = '{bookingId}'

-- Table: listings
SELECT 
  l.id,
  l.host_id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (guest)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{guestProfileId}'
```

### Logique de Notification
```
1. Écouter INSERT sur bookings
2. Récupérer listing.host_id
3. Si host_id === utilisateur_connecté:
   - Récupérer guest name (first_name + last_name ou username)
   - Récupérer listing title
   - Formater dates (checkin_date → checkout_date)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/HostBookingNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 2. Réservation Annulée (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host
- **Titre**: `Réservation annulée`
- **Message**: `{guestName} a annulé sa réservation pour "{listingTitle}"`
- **Route de navigation**: `/host-reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.status` → `cancelled`
- **Condition**: Utilisateur connecté, statut précédent ≠ cancelled

### Tables et Colonnes
```sql
-- Table: bookings
SELECT 
  b.id,
  b.guest_profile_id,
  b.listing_id,
  b.status,
  b.created_at
FROM bookings b
WHERE b.id = '{bookingId}'

-- Table: listings
SELECT 
  l.id,
  l.host_id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (guest)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{guestProfileId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur bookings WHERE status = 'cancelled'
2. Vérifier que ancien_status ≠ 'cancelled'
3. Récupérer listing.host_id
4. Si host_id === utilisateur_connecté:
   - Récupérer guest name
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/GuestCancellationNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 3. Nouveau Commentaire (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host (propriétaire de l'annonce)
- **Titre**: `Nouveau commentaire • {listingTitle}` ou `Nouvelle réponse • {listingTitle}`
- **Message**: `{authorName}: {contentSnippet}` (max 90 chars)
- **Route de navigation**: `/host-comments`
- **Déclencheur**: INSERT dans `listing_comments`
- **Condition**: Utilisateur connecté, commentaire sur son annonce

### Tables et Colonnes
```sql
-- Table: listing_comments
SELECT 
  lc.id,
  lc.listing_id,
  lc.profile_id,
  lc.content,
  lc.parent_comment_id,
  lc.created_at
FROM listing_comments lc
WHERE lc.id = '{commentId}'

-- Table: listings
SELECT 
  l.id,
  l.host_id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (author)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username,
  p.enterprise_name
FROM profiles p
WHERE p.id = '{profileId}'
```

### Logique de Notification
```
1. Écouter INSERT sur listing_comments
2. Récupérer listing.host_id
3. Si host_id === utilisateur_connecté ET profile_id ≠ host_id:
   - Récupérer author name (first_name + last_name ou username ou enterprise_name)
   - Récupérer listing title
   - Déterminer si c'est une réponse (parent_comment_id IS NOT NULL)
   - Créer snippet du contenu (max 90 chars)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/HostCommentNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 4. Nouveau Commentaire (Guest/User)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Guest (visiteur de l'annonce)
- **Titre**: `Nouveau commentaire • {listingTitle}`
- **Message**: `{authorName}: {contentSnippet}` (max 90 chars)
- **Route de navigation**: `/property/{listingId}`
- **Déclencheur**: INSERT dans `listing_comments`
- **Condition**: Utilisateur connecté, a visité l'annonce

### Tables et Colonnes
```sql
-- Table: listing_comments
SELECT 
  lc.id,
  lc.listing_id,
  lc.profile_id,
  lc.content,
  lc.created_at
FROM listing_comments lc
WHERE lc.id = '{commentId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (author)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username,
  p.enterprise_name
FROM profiles p
WHERE p.id = '{profileId}'

-- Table: listing_visits (pour vérifier si utilisateur a visité)
SELECT COUNT(*) as visit_count
FROM listing_visits lv
WHERE lv.listing_id = '{listingId}'
  AND lv.visitor_profile_id = '{currentUserId}'
```

### Logique de Notification
```
1. Écouter INSERT sur listing_comments
2. Vérifier que utilisateur_connecté a visité cette annonce
3. Si oui ET profile_id ≠ utilisateur_connecté:
   - Récupérer author name
   - Récupérer listing title
   - Créer snippet du contenu
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/UserCommentNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 5. Nouvel Avis (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host (propriétaire de l'annonce)
- **Titre**: `Nouvel avis reçu • {listingTitle}`
- **Message**: `{authorName} a laissé {rating}/5 • "{reviewSnippet}"`
- **Route de navigation**: `/host-reviews`
- **Déclencheur**: INSERT dans `reviews` (rating > 0)
- **Condition**: Utilisateur connecté, avis sur son annonce

### Tables et Colonnes
```sql
-- Table: reviews
SELECT 
  r.id,
  r.author_id,
  r.listing_id,
  r.rating,
  r.comment,
  r.created_at
FROM reviews r
WHERE r.id = '{reviewId}'

-- Table: listings
SELECT 
  l.id,
  l.host_id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (author)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{authorId}'
```

### Logique de Notification
```
1. Écouter INSERT sur reviews WHERE rating > 0
2. Récupérer listing.host_id
3. Si host_id === utilisateur_connecté ET author_id ≠ host_id:
   - Récupérer author name
   - Récupérer listing title
   - Récupérer rating (1-5)
   - Créer snippet du comment (max 90 chars)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/HostReviewNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 6. Réponse à Avis (Guest)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Guest (auteur de l'avis)
- **Titre**: `Nouvelle réponse d'hôte • {listingTitle}`
- **Message**: `"{replySnippet}"` ou `Votre hôte a répondu à votre avis`
- **Route de navigation**: `/property/{listingId}/reviews`
- **Déclencheur**: UPDATE `reviews.owner_reply` (ajout/modification)
- **Condition**: Utilisateur connecté, avis écrit par lui

### Tables et Colonnes
```sql
-- Table: reviews
SELECT 
  r.id,
  r.author_id,
  r.listing_id,
  r.owner_reply,
  r.created_at
FROM reviews r
WHERE r.id = '{reviewId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur reviews WHERE owner_reply IS NOT NULL
2. Vérifier que ancien_owner_reply ≠ nouveau_owner_reply
3. Si author_id === utilisateur_connecté:
   - Récupérer listing title
   - Créer snippet de owner_reply (max 90 chars)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/UserReviewReplyNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 7. Visite Confirmée (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host
- **Titre**: `Nouvelle visite confirmée`
- **Message**: `{visitorName} a confirmé sa visite pour {listingTitle}`
- **Route de navigation**: `/host-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté, ancien_status ≠ confirmed

### Tables et Colonnes
```sql
-- Table: rental_visits
SELECT 
  rv.id,
  rv.listing_id,
  rv.visitor_profile_id,
  rv.host_profile_id,
  rv.status,
  rv.scheduled_at,
  rv.created_at
FROM rental_visits rv
WHERE rv.id = '{visitId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (visitor)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{visitorProfileId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur rental_visits WHERE status = 'confirmed'
2. Vérifier que ancien_status ≠ 'confirmed'
3. Si host_profile_id === utilisateur_connecté:
   - Récupérer visitor name
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/HostVisitNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 8. Visite Confirmée (Guest/Visitor)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Visitor/Guest
- **Titre**: `Visite confirmée`
- **Message**: `Votre visite pour {listingTitle} est confirmée`
- **Route de navigation**: `/visits/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: rental_visits
SELECT 
  rv.id,
  rv.listing_id,
  rv.visitor_profile_id,
  rv.status,
  rv.scheduled_at
FROM rental_visits rv
WHERE rv.id = '{visitId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur rental_visits WHERE status = 'confirmed'
2. Vérifier que ancien_status ≠ 'confirmed'
3. Si visitor_profile_id === utilisateur_connecté:
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/VisitNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 9. Visite Confirmée (Landlord)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Landlord (propriétaire du bien)
- **Titre**: `Nouvelle visite confirmée`
- **Message**: `{visitorName} a confirmé sa visite pour {listingTitle}`
- **Route de navigation**: `/landlord-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `confirmed`
- **Condition**: Utilisateur connecté (landlord)

### Tables et Colonnes
```sql
-- Table: rental_visits
SELECT 
  rv.id,
  rv.listing_id,
  rv.visitor_profile_id,
  rv.landlord_profile_id,
  rv.status
FROM rental_visits rv
WHERE rv.id = '{visitId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (visitor)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{visitorProfileId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur rental_visits WHERE status = 'confirmed'
2. Vérifier que ancien_status ≠ 'confirmed'
3. Si landlord_profile_id === utilisateur_connecté:
   - Récupérer visitor name
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/LandlordVisitNotificationBridge.tsx`
- **Status**: ✅ Existant

---

## 10. Statut Application (Host/Landlord)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host ou Landlord
- **Titre**: `Demande approuvée` ou `Demande rejetée`
- **Message**: Dépend du type et du statut
- **Route de navigation**: `/host` ou `/landlord`
- **Déclencheur**: UPDATE `host_applications.status` ou `landlord_applications.status`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: host_applications
SELECT 
  ha.id,
  ha.profile_id,
  ha.status,
  ha.created_at,
  ha.updated_at
FROM host_applications ha
WHERE ha.id = '{applicationId}'

-- Table: landlord_applications
SELECT 
  la.id,
  la.profile_id,
  la.status,
  la.created_at,
  la.updated_at
FROM landlord_applications la
WHERE la.id = '{applicationId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur host_applications ou landlord_applications
2. Vérifier que ancien_status ≠ nouveau_status
3. Si profile_id === utilisateur_connecté:
   - Déterminer le type (host ou landlord)
   - Créer titre et message selon le statut
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File
- **Location**: `src/infrastructure/notifications/ApplicationStatusNotificationBridge.tsx`
- **Status**: ✅ Existant

---

---

# 🆕 NOUVELLES NOTIFICATIONS À IMPLÉMENTER

## 1. Nouvel Abonnement au Profil

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Profil suivi (following_id)
- **Titre**: `Nouvel abonné 👥`
- **Message**: `{followerName} s'est abonné à votre profil`
- **Route de navigation**: `/profile/{followerId}`
- **Déclencheur**: INSERT dans `profile_follows`
- **Condition**: Utilisateur connecté, follower_id ≠ following_id

### Tables et Colonnes
```sql
-- Table: profile_follows
SELECT 
  pf.id,
  pf.follower_id,
  pf.following_id,
  pf.created_at
FROM profile_follows pf
WHERE pf.id = '{followId}'

-- Table: profiles (follower)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username,
  p.avatar_url
FROM profiles p
WHERE p.id = '{followerId}'
```

### Logique de Notification
```
1. Écouter INSERT sur profile_follows
2. Vérifier que follower_id ≠ following_id
3. Si following_id === utilisateur_connecté:
   - Récupérer follower name (first_name + last_name ou username)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/ProfileFollowNotificationBridge.tsx`
- **Status**: ❌ À créer

### Edge Function à Créer
- **Location**: `supabase/functions/send-profile-follow-notification/index.ts`
- **Trigger**: INSERT sur `profile_follows`

---

## 2. Avis Écrit sur Profil (Host)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Profil évalué (reviewed_profile_id)
- **Titre**: `Nouvel avis reçu 🌟`
- **Message**: `{authorName} a laissé {rating}/5 • "{reviewSnippet}"`
- **Route de navigation**: `/host-reviews` ou `/profile/{authorId}`
- **Déclencheur**: INSERT dans `reviews` (rating > 0, reviewed_profile_id IS NOT NULL)
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: reviews
SELECT 
  r.id,
  r.author_id,
  r.listing_id,
  r.reviewed_profile_id,
  r.rating,
  r.comment,
  r.created_at
FROM reviews r
WHERE r.id = '{reviewId}'

-- Table: profiles (author)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{authorId}'
```

### Logique de Notification
```
1. Écouter INSERT sur reviews WHERE rating > 0 AND reviewed_profile_id IS NOT NULL
2. Si reviewed_profile_id === utilisateur_connecté ET author_id ≠ reviewed_profile_id:
   - Récupérer author name
   - Récupérer rating (1-5)
   - Créer snippet du comment (max 90 chars)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/ProfileReviewNotificationBridge.tsx`
- **Status**: ❌ À créer

### Edge Function à Créer
- **Location**: `supabase/functions/send-profile-review-notification/index.ts`
- **Trigger**: INSERT sur `reviews` (reviewed_profile_id IS NOT NULL)

### Migration SQL Nécessaire
```sql
-- Ajouter colonne à la table reviews si elle n'existe pas
ALTER TABLE reviews 
ADD COLUMN reviewed_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_reviews_reviewed_profile_id ON reviews(reviewed_profile_id);
```

---

## 3. Remboursement Traité

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Guest (guest_profile_id)
- **Titre**: `Remboursement traité ✅`
- **Message**: `Votre remboursement de {amount} {currency} a été traité`
- **Route de navigation**: `/reservations/{bookingId}`
- **Déclencheur**: UPDATE `refunds.status` → `completed`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: refunds
SELECT 
  r.id,
  r.booking_id,
  r.guest_profile_id,
  r.host_profile_id,
  r.amount,
  r.currency,
  r.status,
  r.processed_at
FROM refunds r
WHERE r.id = '{refundId}'

-- Table: bookings
SELECT 
  b.id,
  b.guest_profile_id,
  b.listing_id
FROM bookings b
WHERE b.id = '{bookingId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur refunds WHERE status = 'completed'
2. Vérifier que ancien_status ≠ 'completed'
3. Si guest_profile_id === utilisateur_connecté:
   - Récupérer amount et currency
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/RefundNotificationBridge.tsx`
- **Status**: ❌ À créer (contexte existant: RefundNotificationContext)

### Edge Function à Créer
- **Location**: `supabase/functions/send-refund-notification/index.ts`
- **Trigger**: UPDATE sur `refunds` (status = 'completed')

---

## 4. Annulation de Visite

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Host (host_profile_id)
- **Titre**: `Visite annulée ❌`
- **Message**: `{visitorName} a annulé sa visite pour {listingTitle}`
- **Route de navigation**: `/host-visit/{visitId}` ou `/landlord-visit/{visitId}`
- **Déclencheur**: UPDATE `rental_visits.status` → `cancelled`
- **Condition**: Utilisateur connecté, ancien_status ≠ cancelled

### Tables et Colonnes
```sql
-- Table: rental_visits
SELECT 
  rv.id,
  rv.listing_id,
  rv.visitor_profile_id,
  rv.host_profile_id,
  rv.landlord_profile_id,
  rv.status,
  rv.cancelled_by,
  rv.cancellation_reason
FROM rental_visits rv
WHERE rv.id = '{visitId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'

-- Table: profiles (visitor)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{visitorProfileId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur rental_visits WHERE status = 'cancelled'
2. Vérifier que ancien_status ≠ 'cancelled'
3. Si host_profile_id === utilisateur_connecté:
   - Récupérer visitor name
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
4. Si landlord_profile_id === utilisateur_connecté:
   - Même logique pour landlord
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/VisitCancellationNotificationBridge.tsx`
- **Status**: ❌ À créer

### Edge Function à Créer
- **Location**: `supabase/functions/send-visit-cancellation-notification/index.ts`
- **Trigger**: UPDATE sur `rental_visits` (status = 'cancelled')

### Migration SQL Nécessaire
```sql
-- Ajouter colonnes à la table rental_visits si elles n'existent pas
ALTER TABLE rental_visits 
ADD COLUMN cancelled_by TEXT,
ADD COLUMN cancellation_reason TEXT;
```

---

## 5. Annulation de Réservation (Guest)

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Guest (guest_profile_id)
- **Titre**: `Réservation annulée ❌`
- **Message**: `Votre réservation pour {listingTitle} a été annulée`
- **Route de navigation**: `/reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.status` → `cancelled` (par host)
- **Condition**: Utilisateur connecté, annulation par host

### Tables et Colonnes
```sql
-- Table: bookings
SELECT 
  b.id,
  b.guest_profile_id,
  b.listing_id,
  b.status,
  b.cancelled_by,
  b.cancellation_reason,
  b.cancelled_at
FROM bookings b
WHERE b.id = '{bookingId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur bookings WHERE status = 'cancelled'
2. Vérifier que ancien_status ≠ 'cancelled' ET cancelled_by = 'host'
3. Si guest_profile_id === utilisateur_connecté:
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/BookingCancellationGuestNotificationBridge.tsx`
- **Status**: ❌ À créer

### Edge Function à Créer
- **Location**: `supabase/functions/send-booking-cancellation-guest-notification/index.ts`
- **Trigger**: UPDATE sur `bookings` (status = 'cancelled', cancelled_by = 'host')

### Migration SQL Nécessaire
```sql
-- Ajouter colonnes à la table bookings si elles n'existent pas
ALTER TABLE bookings 
ADD COLUMN cancelled_by TEXT,
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP;
```

---

## 6. Demande de Paiement Restant

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Guest (guest_profile_id)
- **Titre**: `Paiement demandé 💳`
- **Message**: `Paiement restant de {amount} {currency} demandé pour {listingTitle}`
- **Route de navigation**: `/reservations/{bookingId}`
- **Déclencheur**: UPDATE `bookings.remaining_payment_status` → `requested`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: bookings
SELECT 
  b.id,
  b.guest_profile_id,
  b.listing_id,
  b.remaining_amount,
  b.currency,
  b.remaining_payment_status
FROM bookings b
WHERE b.id = '{bookingId}'

-- Table: listings
SELECT 
  l.id,
  l.title
FROM listings l
WHERE l.id = '{listingId}'
```

### Logique de Notification
```
1. Écouter UPDATE sur bookings WHERE remaining_payment_status = 'requested'
2. Vérifier que ancien_status ≠ 'requested'
3. Si guest_profile_id === utilisateur_connecté:
   - Récupérer remaining_amount et currency
   - Récupérer listing title
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/PaymentRequestNotificationBridge.tsx`
- **Status**: ❌ À créer (contexte existant: RemainingPaymentHandler)

### Edge Function à Créer
- **Location**: `supabase/functions/send-payment-request-notification/index.ts`
- **Trigger**: UPDATE sur `bookings` (remaining_payment_status = 'requested')

---

## 7. Message Reçu

### Informations Générales
- **Type**: In-app + Push
- **Utilisateur cible**: Recipient (recipient_id)
- **Titre**: `Nouveau message 💬`
- **Message**: `{senderName}: {messageSnippet}` (max 90 chars)
- **Route de navigation**: `/messages/{conversationId}`
- **Déclencheur**: INSERT dans `listing_messages`
- **Condition**: Utilisateur connecté

### Tables et Colonnes
```sql
-- Table: listing_messages
SELECT 
  lm.id,
  lm.conversation_id,
  lm.sender_id,
  lm.recipient_id,
  lm.content,
  lm.created_at
FROM listing_messages lm
WHERE lm.id = '{messageId}'

-- Table: listing_conversations
SELECT 
  lc.id,
  lc.listing_id,
  lc.participant_1_id,
  lc.participant_2_id
FROM listing_conversations lc
WHERE lc.id = '{conversationId}'

-- Table: profiles (sender)
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.username
FROM profiles p
WHERE p.id = '{senderId}'
```

### Logique de Notification
```
1. Écouter INSERT sur listing_messages
2. Si recipient_id === utilisateur_connecté:
   - Récupérer sender name
   - Créer snippet du message (max 90 chars)
   - Afficher notification in-app
   - Envoyer push si déconnecté
```

### Bridge File à Créer
- **Location**: `src/infrastructure/notifications/MessageNotificationBridge.tsx`
- **Status**: ❌ À créer

### Edge Function à Créer
- **Location**: `supabase/functions/send-message-notification/index.ts`
- **Trigger**: INSERT sur `listing_messages`

---

# 🏗️ ARCHITECTURE TECHNIQUE

## Structure des NotificationBridge

```typescript
// Pattern standard pour tous les NotificationBridge

import { useEffect, useRef, useState } from 'react';
import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_[TYPE]_STORAGE_KEY = 'notified_[type]_cache';

const [Type]NotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const notifiedRef = useRef<Set<string>>(new Set());
  const [notifiedLoaded, setNotifiedLoaded] = useState(false);

  // 1. Charger le cache
  useEffect(() => {
    const loadNotified = async () => {
      try {
        const notifiedIds = await loadIdsFromStorage(NOTIFIED_[TYPE]_STORAGE_KEY);
        notifiedRef.current = notifiedIds;
      } catch (error) {
        console.error('[Bridge] Error loading cache:', error);
      } finally {
        setNotifiedLoaded(true);
      }
    };
    loadNotified();
  }, []);

  // 2. Écouter les changements Realtime
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile?.id || !notifiedLoaded) {
      return;
    }

    const channel = supabase
      .channel(`[channel-name]:${supabaseProfile.id}`)
      .on('postgres_changes', { schema: 'public', table: '[table]', event: '[EVENT]' }, async (payload) => {
        // Logique de notification
        const notificationKey = `[type]-${payload.new.id}`;
        if (notifiedRef.current.has(notificationKey)) {
          return;
        }

        try {
          showNotification({
            id: `[type]-${payload.new.id}-${Date.now()}`,
            title: '[Title]',
            message: '[Message]',
            action: { type: 'link', href: '[route]' },
          });

          notifiedRef.current.add(notificationKey);
          await saveIdsToStorage(NOTIFIED_[TYPE]_STORAGE_KEY, notifiedRef.current);
        } catch (error) {
          console.error('[Bridge] Error showing notification:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, supabaseProfile?.id, notifiedLoaded, showNotification]);

  return null;
};

export default [Type]NotificationBridge;
```

## Structure des Edge Functions

```typescript
// Pattern standard pour tous les Edge Functions

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

Deno.serve(async (req: Request) => {
  const { record, old_record } = await req.json();

  try {
    // 1. Récupérer les données nécessaires
    // 2. Vérifier les conditions
    // 3. Appeler OneSignal API pour envoyer la push notification
    // 4. Retourner la réponse

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

## Intégration dans app/_layout.tsx

```typescript
// Ajouter tous les NotificationBridge dans le layout

import [Type]NotificationBridge from '@/src/infrastructure/notifications/[Type]NotificationBridge';

export default function RootLayout() {
  return (
    <PreloadProvider>
      <AuthProvider>
        {/* ... autres providers ... */}
        <NotificationProvider>
          {/* ... */}
          <[Type]NotificationBridge />
          {/* Ajouter tous les bridges ici */}
          <NotificationHost />
        </NotificationProvider>
      </AuthProvider>
    </PreloadProvider>
  );
}
```

---

# 📝 MIGRATIONS SQL NÉCESSAIRES

```sql
-- Ajouter colonne reviewed_profile_id à reviews
ALTER TABLE reviews 
ADD COLUMN reviewed_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX idx_reviews_reviewed_profile_id ON reviews(reviewed_profile_id);

-- Ajouter colonnes à rental_visits
ALTER TABLE rental_visits 
ADD COLUMN cancelled_by TEXT,
ADD COLUMN cancellation_reason TEXT;

-- Ajouter colonnes à bookings
ALTER TABLE bookings 
ADD COLUMN cancelled_by TEXT,
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancelled_at TIMESTAMP;

-- Créer table refunds si elle n'existe pas
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  host_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_guest_profile_id ON refunds(guest_profile_id);
CREATE INDEX idx_refunds_status ON refunds(status);
```

---

## 📋 Checklist d'Implémentation

Pour chaque nouvelle notification:

- [ ] Créer le NotificationBridge (in-app)
- [ ] Ajouter le bridge dans `app/_layout.tsx`
- [ ] Créer l'Edge Function (push)
- [ ] Configurer le trigger Supabase
- [ ] Ajouter les migrations SQL si nécessaire
- [ ] Tester in-app (connecté)
- [ ] Tester push (déconnecté)
- [ ] Documenter les routes et les tables utilisées

