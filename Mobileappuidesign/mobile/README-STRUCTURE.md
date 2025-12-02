# 📁 Structure du projet PUOL (post-restructuration)

## 🎯 Objectifs
- Scalabilité : séparer par domaine métier (features)
- Lisibilité : composants réutilisables dans `src/components/`
- Maintenance isolée : services, hooks, types par feature
- Routes claires avec Expo Router dans `app/`

## 📂 Arborescence cible

```
mobile/
├─ app/                          # Routes Expo Router (file-based)
│  ├─ (tabs)/                    # Navigation principale
│  ├─ host/                      # Espace hôte
│  ├─ (modals)/                  # Routes modales
│  ├─ support/
│  └─ _layout.tsx                # Providers globaux
├─ src/
│  ├─ components/                # UI réutilisable
│  │  ├─ ui/                     # Boutons, inputs, cartes...
│  │  ├─ forms/                  # Formulaires complexes
│  │  ├─ layout/                 # Header, container...
│  │  └─ media/                  # Image, vidéo, galerie...
│  ├─ features/                  # Par domaine métier
│  │  ├─ auth/
│  │  │  ├─ components/
│  │  │  ├─ hooks/
│  │  │  ├─ services/
│  │  │  └─ types/
│  │  ├─ host/
│  │  ├─ bookings/
│  │  ├─ listings/
│  │  ├─ messages/
│  │  ├─ payments/
│  │  ├─ notifications/
│  │  └── search/
│  ├─ infrastructure/            # Couches basses
│  │  ├─ notifications/
│  │  ├─ storage/
│  │  └── analytics/
│  ├─ services/                  # API externes (Supabase, Firebase)
│  ├─ hooks/                     # Hooks globaux
│  ├─ utils/
│  ├─ constants/
│  └── types/
├─ __tests__/                    # Tests
└─ assets/
```

## ✅ Quick wins appliqués

- ✅ Dossiers `src/features/` créés par domaine
- ✅ Composants complexes déplacés vers `src/features/*/components/`
- ✅ Services et hooks déplacés dans leurs features
- ✅ `constants/` fusionné dans `src/constants/`
- ✅ Notifications centralisées dans `src/infrastructure/notifications/`
- ✅ `host-dashboard.tsx` allégé via composants extraits
- ✅ Index files pour exports propres

## 🧭 Prochaines étapes recommandées

1. **Extraire les gros écrans restants** (`host.tsx`, `landlord.tsx`)
2. **Créer des composants UI réutilisables** (`Button`, `Input`, `Card`...)
3. **Ajouter des tests** dans `__tests__/`
4. **Standardiser les types** par feature
5. **Documenter chaque feature** avec un mini-README

## 🛠 Outils utilisés

- Expo Router (file-based routing)
- TypeScript
- Supabase (backend)
- Firebase Auth
- AsyncStorage (local)

---

> Cette structure permet de monter à 10+ features sans friction. Chaque feature peut être développée, testée et maintenue isolément.
