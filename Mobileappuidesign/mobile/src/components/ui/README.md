# 🎨 Composants UI PUOL

Cette librairie contient les composants réutilisables pour l’application PUOL.

## 📦 Import

```tsx
import { Button, Badge, Avatar, Spinner, Select, StatusBadge, ListItem } from '@/src/components/ui';
```

## 🎯 Composants disponibles

### Button
Boutons réutilisables avec variantes et tailles.

```tsx
<Button title="Continuer" onPress={() => {}} variant="primary" size="medium" />
<Button title="Annuler" onPress={() => {}} variant="outline" size="small" />
<Button title="Chargement..." onPress={() => {}} loading disabled />
```

**Props :**
- `title`: string
- `onPress`: () => void
- `variant?`: 'primary' | 'secondary' | 'outline'
- `size?`: 'small' | 'medium' | 'large'
- `disabled?`: boolean
- `loading?`: boolean

### Badge
Badges pour statuts et étiquettes.

```tsx
<Badge variant="success" icon="check">Vérifié</Badge>
<Badge variant="warning" icon="clock">En attente</Badge>
<Badge variant="error">Erreur</Badge>
```

**Props :**
- `children`: React.ReactNode
- `variant?`: 'default' | 'success' | 'warning' | 'error' | 'info'
- `size?`: 'small' | 'medium' | 'large'
- `icon?`: keyof typeof Feather.glyphMap

### StatusBadge
Badge automatique selon le statut.

```tsx
<StatusBadge status="confirmed" />
<StatusBadge status="pending">En attente de validation</StatusBadge>
<StatusBadge status="cancelled" />
```

**Props :**
- `status`: string
- `children?`: React.ReactNode

### Avatar
Photos profil avec initiales en fallback.

```tsx
<Avatar source={{ uri: 'https://example.com/photo.jpg' }} size="md" />
<Avatar name="Jean Dupont" size="lg" variant="circle" />
<Avatar name="Marie" fallback="MD" size="sm" variant="square" />
```

**Props :**
- `source?`: { uri: string } | number
- `name?`: string
- `size?`: 'small' | 'medium' | 'large' | 'xlarge'
- `variant?`: 'circle' | 'square'
- `fallback?`: string

### Spinner
Indicateurs de chargement.

```tsx
<Spinner size="small" />
<Spinner size="large" color="#2ECC71" />
<Spinner overlay={true} />
```

**Props :**
- `size?`: 'small' | 'large' | number
- `color?`: string
- `overlay?`: boolean

### Select
Listes déroulantes modales.

```tsx
const options = [
  { label: 'Studio', value: 'studio' },
  { label: 'Appartement', value: 'apartment' },
  { label: 'Maison', value: 'house' },
];

<Select
  options={options}
  value={selectedType}
  onSelect={(value) => setSelectedType(value)}
  placeholder="Type de bien"
/>
```

**Props :**
- `options`: SelectOption[]
- `value?`: string | number
- `placeholder?`: string
- `onSelect`: (value: string | number) => void
- `disabled?`: boolean

### ListItem
Éléments de liste réutilisables.

```tsx
<ListItem
  title="Réservations"
  subtitle="Voir mes réservations"
  leftIcon="calendar"
  rightIcon="chevron-right"
  onPress={() => router.push('/reservations')}
/>
```

**Props :**
- `title`: string
- `subtitle?`: string
- `leftIcon?`: keyof typeof Feather.glyphMap
- `rightIcon?`: keyof typeof Feather.glyphMap
- `onPress?`: () => void
- `disabled?`: boolean

## 🎨 Utilisation avec le thème

```tsx
import { PUOL_COLORS, PUOL_SPACING } from '@/src/constants/theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: PUOL_COLORS.surface,
    padding: PUOL_SPACING.md,
    borderRadius: PUOL_BORDER_RADIUS.lg,
  },
});
```

## 💡 Conseils

- Utiliser `StatusBadge` pour les statuts automatiques
- Utiliser `Spinner overlay={true}` pour les chargements sur modaux
- Utiliser `Avatar` avec `name` pour les initiales automatiques
- Utiliser `ListItem` pour les menus et listes d’actions
