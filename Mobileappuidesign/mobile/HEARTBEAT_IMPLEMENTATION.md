# Système de Heartbeat - Implémentation Complète

## Vue d'ensemble
Un système de heartbeat a été implémenté pour tracker les utilisateurs actifs ET les visiteurs anonymes en temps quasi-réel dans l'application Expo (React Native). Le système envoie des mises à jour d'activité à deux tables Supabase :
- `user_activity_heartbeat` pour les utilisateurs connectés
- `visitor_activity_heartbeat` pour les visiteurs non connectés (anonymes)

## Structure des tables Supabase

### user_activity_heartbeat (utilisateurs connectés)
```typescript
user_activity_heartbeat {
  user_id: string (UUID, clé primaire)
  last_activity_at: string (timestamptz)
  platform: string | null ("ios" ou "android")
  app_version: string | null
  city: string | null
  updated_at: string (timestamptz)
}
```

### visitor_activity_heartbeat (visiteurs anonymes)
```typescript
visitor_activity_heartbeat {
  visitor_id: string (TEXT, clé primaire - UUID v4)
  last_activity_at: string (timestamptz)
  platform: string | null ("ios" ou "android")
  app_version: string | null
  city: string | null
  linked_user_id: string | null (Firebase UID quand le visiteur se connecte)
  merged_at: string | null (timestamptz - moment du merge)
  updated_at: string (timestamptz)
}
```

## Fichiers créés/modifiés

### 1. Service de gestion du visitor_id
**Fichier:** `src/utils/visitorId.ts` (NOUVEAU)

- **`getOrCreateVisitorId(): Promise<string>`**: Récupère ou génère un visitor_id persistant
  - Génère un UUID v4 au premier lancement
  - Stocke en AsyncStorage sous la clé `PUOL_VISITOR_ID`
  - Réutilise le même visitor_id tant que l'app est installée
  - Cache en mémoire pour éviter les accès répétés au stockage

- **`getCachedVisitorId(): string | null`**: Récupère le visitor_id en cache (sans accès au stockage)

- **`resetVisitorIdCache(): void`**: Réinitialise le cache (appelé au logout)

### 2. Fonction utilitaire heartbeat (ÉTENDUE)
**Fichier:** `src/utils/heartbeat.ts`

#### Nouvelles fonctions :

- **`sendUserHeartbeat(userId: string, city?: string | null)`**: Envoie un heartbeat pour un utilisateur connecté
  - Effectue un upsert dans `user_activity_heartbeat`
  - Inclut: `user_id`, `last_activity_at`, `platform`, `app_version`, `city`
  
- **`sendVisitorHeartbeat(visitorId: string, city?: string | null)`**: Envoie un heartbeat pour un visiteur anonyme
  - Effectue un upsert dans `visitor_activity_heartbeat`
  - Inclut: `visitor_id`, `last_activity_at`, `platform`, `app_version`, `city`

- **`trackActivity(userId: string | null | undefined, city?: string | null)`**: Wrapper intelligent
  - Si userId fourni et valide → appelle `sendUserHeartbeat()`
  - Sinon → appelle `sendVisitorHeartbeat()` avec le visitor_id généré
  - **Ceci est le point d'entrée principal à utiliser dans le code métier**

- **`sendHeartbeat(userId: string, city?: string | null)`**: Alias pour compatibilité rétroactive
  - Appelle `trackActivity()` en interne
  - Permet de ne pas casser le code existant

#### Throttle en mémoire :
- Max 1 heartbeat toutes les 30 secondes par identifier (user_id ou visitor_id)
- Variables statiques: `lastHeartbeatTime`, `lastHeartbeatIdentifier`, `lastHeartbeatType`
- Fonction `resetHeartbeatThrottle()` pour réinitialiser après foreground

### 3. Hook de cycle de vie app (MISE À JOUR)
**Fichier:** `src/hooks/useAppLifecycle.ts`

- Écoute les changements d'état de l'app (AppState)
- Appelle `trackActivity(supabaseProfile?.id)` quand l'app passe en **foreground** (réinitialise le throttle)
- Appelle `trackActivity(supabaseProfile?.id)` quand l'app passe en **background** (best effort)
- Gère automatiquement user vs visitor selon la présence du userId
- Intégré dans `app/_layout.tsx` via le composant `AppLifecycleManager`

### 4. AuthContext (MISE À JOUR)
**Fichier:** `src/features/auth/hooks/AuthContext.tsx`

#### Au login (quand user se connecte) :
- Récupère le visitor_id local via `getOrCreateVisitorId()`
- Fait un UPDATE sur `visitor_activity_heartbeat` pour :
  - `linked_user_id = <firebase_uid>`
  - `merged_at = now()`
  - `last_activity_at = now()`
- À partir de ce moment, les heartbeats vont automatiquement utiliser `sendUserHeartbeat()` (via `trackActivity()`)

#### Au logout :
- Appelle `resetVisitorIdCache()` pour réinitialiser le cache du visitor_id
- Les prochains heartbeats utiliseront `sendVisitorHeartbeat()` avec un nouveau visitor_id

### 5. Intégration dans les handlers d'actions

Le code existant continue de fonctionner sans modification car `sendHeartbeat()` est un alias pour `trackActivity()`.

#### Listing views
**Fichier:** `src/features/listings/services/viewService.ts`
- `trackListingView()`: Appelle `sendHeartbeat(viewer.id, viewer.city)` après insertion
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Likes
**Fichier:** `src/features/likes/services/index.ts`
- `toggleListingLike()`: Appelle `sendHeartbeat(profileId)` après like
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Partages
**Fichier:** `src/features/listings/services/shareService.ts`
- `recordListingShare()`: Appelle `sendHeartbeat(profileId)` après partage
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Commentaires
**Fichier:** `src/features/comments/services/index.ts`
- `createListingComment()`: Appelle `sendHeartbeat(profileId)` après création
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Réservations
**Fichier:** `src/features/bookings/services/index.ts`
- `createBooking()`: Appelle `sendHeartbeat(guestProfileId)` après création
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Visites
**Fichier:** `src/features/rental-visits/services.ts`
- `createRentalVisit()`: Appelle `sendHeartbeat(guestProfileId)` après création
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

#### Reviews
**Fichier:** `src/features/reviews/hooks/useListingReviews.ts`
- `submitReview()`: Appelle `sendHeartbeat(effectiveUserId)` après soumission
- ✅ Fonctionne pour users connectés ET visiteurs anonymes

## Flux d'utilisation

### Pour les utilisateurs connectés
1. **Action utilisateur** (like, commentaire, réservation, etc.)
2. **Service/Hook** traite l'action et appelle `sendHeartbeat(userId)`
3. **sendHeartbeat()** → `trackActivity(userId)` → `sendUserHeartbeat(userId)`
4. **Upsert** dans `user_activity_heartbeat` avec throttle de 30s
5. **Erreur**: Loggée mais n'affecte pas l'app

### Pour les visiteurs anonymes
1. **Action utilisateur** (like, commentaire, réservation, etc.)
2. **Service/Hook** traite l'action et appelle `sendHeartbeat(null)` ou `trackActivity(null)`
3. **trackActivity()** récupère le visitor_id persistant via `getOrCreateVisitorId()`
4. **sendVisitorHeartbeat(visitorId)** → **Upsert** dans `visitor_activity_heartbeat` avec throttle de 30s
5. **Erreur**: Loggée mais n'affecte pas l'app

### Au login (merge)
1. Utilisateur se connecte (OTP validé, profil créé)
2. **AuthContext** récupère le visitor_id local
3. **UPDATE** sur `visitor_activity_heartbeat` pour lier le visitor_id au user_id
4. À partir de ce moment, `trackActivity()` utilise automatiquement `sendUserHeartbeat()`
5. **Aucun double comptage** car les visiteurs "merged" ne sont plus comptés côté visitors

### Au logout
1. Utilisateur se déconnecte
2. **AuthContext** appelle `resetVisitorIdCache()`
3. Les prochains heartbeats utiliseront un **nouveau visitor_id** (généré à la prochaine action)

## Calcul back-office

### Utilisateurs en ligne
```sql
SELECT COUNT(DISTINCT user_id) as online_users
FROM user_activity_heartbeat
WHERE last_activity_at > now() - interval '5 minutes'
```

### Visiteurs en ligne (non-merged)
```sql
SELECT COUNT(DISTINCT visitor_id) as online_visitors
FROM visitor_activity_heartbeat
WHERE last_activity_at > now() - interval '5 minutes'
  AND merged_at IS NULL
```

### Total en ligne (sans double comptage)
```sql
SELECT 
  (SELECT COUNT(DISTINCT user_id) FROM user_activity_heartbeat WHERE last_activity_at > now() - interval '5 minutes') +
  (SELECT COUNT(DISTINCT visitor_id) FROM visitor_activity_heartbeat WHERE last_activity_at > now() - interval '5 minutes' AND merged_at IS NULL)
  as total_online
```

## Points clés

✅ **Deux tables séparées** : `user_activity_heartbeat` et `visitor_activity_heartbeat`
✅ **Throttle anti-spam** : 30 secondes entre les heartbeats (sauf après foreground)
✅ **Gestion d'erreurs** : Aucune erreur ne plante l'app
✅ **Cycle de vie** : Foreground/background gérés pour users ET visiteurs
✅ **Visitor_id persistant** : UUID v4 généré une seule fois et réutilisé
✅ **Merge automatique** : Au login, le visitor_id est lié au user_id
✅ **Pas de double comptage** : Les visiteurs merged ne sont plus comptés côté visitors
✅ **Compatibilité rétroactive** : Le code existant fonctionne sans modification
✅ **Données optionnelles** : `city`, `app_version` peuvent être null
✅ **Intégration minimale** : Aucune modification nécessaire dans les services existants

## Validation

- [x] Service `visitorId.ts` créé pour gestion persistante du visitor_id
- [x] Fonction `sendUserHeartbeat()` créée pour users connectés
- [x] Fonction `sendVisitorHeartbeat()` créée pour visiteurs anonymes
- [x] Fonction `trackActivity()` créée comme wrapper intelligent
- [x] Alias `sendHeartbeat()` pour compatibilité rétroactive
- [x] Hook `useAppLifecycle.ts` mis à jour pour supporter users ET visiteurs
- [x] AuthContext mis à jour avec merge au login
- [x] Throttle amélioré pour supporter user ET visitor
- [x] Cycle de vie app (foreground/background) gérés pour les deux cas
- [x] Gestion d'erreurs robuste
- [x] Pas de dépendances externes ajoutées
- [x] Compatible avec la structure Supabase existante
- [x] Documentation complète

## Prochaines étapes (optionnelles)

1. Ajouter un device_id pour distinguer les appareils des visiteurs anonymes
2. Monitorer les performances du heartbeat en production
3. Ajuster le throttle si nécessaire (actuellement 30 secondes)
4. Ajouter des métriques de heartbeat au back-office
5. Implémenter des requêtes SQL back-office pour calculer les statistiques online
