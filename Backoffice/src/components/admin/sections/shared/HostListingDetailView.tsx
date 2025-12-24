import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import type { HostListingDetail } from '../../UsersManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  ShieldOff,
  Pencil,
  Home,
  DollarSign,
  Users,
  Shield,
  Maximize2,
  CheckCircle2,
  Clock4,
  Eye,
  MessageSquare,
  CalendarCheck,
  UserCheck,
  Star,
  Video,
  Images,
  Plus,
  Trash2,
  AtSign,
  Phone,
  User as UserIcon,
} from 'lucide-react';

type HostListingDetailViewProps = {
  listing: HostListingDetail;
  onBack: () => void;
  onViewHostProfile?: (hostId: string) => void;
};

const statusBadgeStyles = {
  pending: 'bg-orange-100 text-orange-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-gray-100 text-gray-700',
};

const priceFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  maximumFractionDigits: 0,
});

const listingStatusOptions: { value: HostListingDetail['status']; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'rejected', label: 'Refusée' },
  { value: 'suspended', label: 'Suspendue' },
];

export function HostListingDetailView({ listing: initialListing, onBack, onViewHostProfile }: HostListingDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentListing, setCurrentListing] = useState(initialListing);
  const [draftListing, setDraftListing] = useState(initialListing);

  useEffect(() => {
    setCurrentListing(initialListing);
    setDraftListing(initialListing);
    setIsEditing(false);
  }, [initialListing]);

  const listing = isEditing ? draftListing : currentListing;
  const canViewHostProfile = Boolean(onViewHostProfile && listing.ownerProfileId);

  const handleFieldChange = <K extends keyof HostListingDetail>(field: K, value: HostListingDetail[K]) => {
    setDraftListing((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNumericFieldChange = (field: keyof HostListingDetail, value: string) => {
    handleFieldChange(field as keyof HostListingDetail, value === '' ? ('' as any) : Number(value));
  };

  const handleRoomBreakdownChange = (roomKey: keyof HostListingDetail['roomBreakdown'], value: string) => {
    setDraftListing((prev) => ({
      ...prev,
      roomBreakdown: {
        ...prev.roomBreakdown,
        [roomKey]: Number(value),
      },
    }));
  };

  const handleMediaRemove = (assetId: string) => {
    setDraftListing((prev) => ({
      ...prev,
      mediaAssets: prev.mediaAssets.filter((asset) => asset.id !== assetId),
    }));
  };

  const handleMediaAdd = () => {
    setDraftListing((prev) => ({
      ...prev,
      mediaAssets: [
        ...prev.mediaAssets,
        {
          id: `new-${Date.now()}`,
          type: 'photo',
          label: 'Nouveau média',
          room: null,
          thumbnailUrl: prev.coverUrl,
        },
      ],
    }));
  };

  const handleSaveDraft = () => {
    setCurrentListing(draftListing);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftListing(currentListing);
    setIsEditing(false);
  };

  const toggleEditing = () => setIsEditing(true);

  const infoChips: InfoChipProps[] = [
    {
      icon: Home,
      label: 'Type de bien',
      value: listing.propertyType,
    },
    {
      icon: DollarSign,
      label: 'Tarif de base',
      value: `${listing.price.toLocaleString('fr-FR')} FCFA / ${listing.priceType}`,
    },
    {
      icon: Shield,
      label: 'Caution',
      value: listing.depositAmount ? priceFormatter.format(listing.depositAmount) : 'Non renseignée',
    },
    {
      icon: Clock4,
      label: 'Séjour minimum',
      value: listing.minLeaseMonths ? `${listing.minLeaseMonths} nuits` : 'Non précisé',
    },
    {
      icon: Users,
      label: 'Capacité',
      value: `${listing.guestCapacity} voyageurs`,
    },
    {
      icon: CheckCircle2,
      label: 'Disponibilité',
      value: listing.isAvailable ? 'Active' : 'Désactivée',
      tone: listing.isAvailable ? 'success' : 'warning',
    },
  ];

  if (listing.isCommercial) {
    infoChips.splice(5, 0, {
      icon: Maximize2,
      label: 'Surface',
      value: listing.surfaceArea ? `${listing.surfaceArea} m²` : '—',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux annonces hôtes
        </Button>
        <Badge variant="outline" className="rounded-full text-xs">
          {listing.id}
        </Badge>
        <div className="ml-auto flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" className="rounded-full" onClick={handleCancelEdit}>
                Annuler
              </Button>
              <Button className="rounded-full bg-[#2ECC71] hover:bg-[#27AE60]" onClick={handleSaveDraft}>
                Sauvegarder
              </Button>
            </>
          ) : (
            <Button className="rounded-full" onClick={toggleEditing}>
              Modifier le contenu
            </Button>
          )}
        </div>
      </div>

      <Card className="rounded-3xl overflow-hidden border-gray-100">
        <div className="grid md:grid-cols-[3fr_2fr]">
          <div className="relative h-64 md:h-full">
            <img src={listing.coverUrl} alt={listing.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
              <p className="text-sm uppercase tracking-wide text-white/70">Couverture</p>
              <p className="text-lg font-semibold">
                {listing.city} · {listing.district}
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs uppercase text-gray-500">Titre annonce</p>
              <h1 className="text-2xl font-semibold text-gray-900">{listing.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeStyles[listing.status]}>{getStatusLabel(listing.status)}</Badge>
              <Badge variant="outline" className="rounded-full">
                {listing.propertyType}
              </Badge>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Tarification</p>
              <p className="text-3xl font-semibold text-gray-900">
                {listing.price.toLocaleString('fr-FR')} FCFA
                <span className="text-base font-medium text-gray-500"> / {listing.priceType}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-xs uppercase text-gray-500">Visites planifiées</p>
                <p className="text-lg font-semibold text-gray-900">{listing.visits}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-xs uppercase text-gray-500">Séjours confirmés</p>
                <p className="text-lg font-semibold text-gray-900">{listing.bookings}</p>
              </div>
            </div>
            {listing.gallery.length > 0 && (
              <div className="flex gap-2">
                {listing.gallery.slice(0, 3).map((image) => (
                  <div
                    key={image}
                    className="h-16 w-16 rounded-2xl border border-gray-100 bg-cover bg-center"
                    style={{ backgroundImage: `url(${image})` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {infoChips.map((chip) => (
          <InfoChip key={chip.label} {...chip} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              {isEditing ? (
                <Textarea
                  value={draftListing.description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleFieldChange('description', event.target.value)
                  }
                  rows={6}
                  className="rounded-2xl"
                  placeholder="Décrivez les points forts du séjour..."
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Conditions & disponibilité</h2>
              {isEditing ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <EditableField
                    label="Tarif (FCFA)"
                    icon={DollarSign}
                    inputProps={{
                      id: 'price',
                      type: 'number',
                      value: draftListing.price?.toString() ?? '',
                      onChange: (event: ChangeEvent<HTMLInputElement>) =>
                        handleNumericFieldChange('price', event.target.value),
                    }}
                  />
                  <EditableField
                    label="Caution (FCFA)"
                    icon={Shield}
                    inputProps={{
                      id: 'deposit',
                      type: 'number',
                      value: draftListing.depositAmount?.toString() ?? '',
                      onChange: (event: ChangeEvent<HTMLInputElement>) =>
                        handleNumericFieldChange('depositAmount', event.target.value),
                    }}
                  />
                  <EditableField
                    label="Séjour minimum (nuits)"
                    icon={Clock4}
                    inputProps={{
                      id: 'minStay',
                      type: 'number',
                      min: 0,
                      value: draftListing.minLeaseMonths?.toString() ?? '',
                      onChange: (event: ChangeEvent<HTMLInputElement>) =>
                        handleNumericFieldChange('minLeaseMonths', event.target.value),
                    }}
                  />
                  <EditableField
                    label="Capacité voyageurs"
                    icon={Users}
                    inputProps={{
                      id: 'capacity',
                      type: 'number',
                      min: 1,
                      value: draftListing.guestCapacity?.toString() ?? '',
                      onChange: (event: ChangeEvent<HTMLInputElement>) =>
                        handleNumericFieldChange('guestCapacity', event.target.value),
                    }}
                  />
                  {draftListing.isCommercial && (
                    <EditableField
                      label="Surface (m²)"
                      icon={Maximize2}
                      inputProps={{
                        id: 'surface',
                        type: 'number',
                        min: 0,
                        value: draftListing.surfaceArea?.toString() ?? '',
                        onChange: (event: ChangeEvent<HTMLInputElement>) =>
                          handleNumericFieldChange('surfaceArea', event.target.value),
                      }}
                    />
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm text-gray-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Statut & visibilité
                    </Label>
                    <Select
                      value={draftListing.status}
                      onValueChange={(value) => handleFieldChange('status', value as HostListingDetail['status'])}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {listingStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Annonce visible</p>
                        <p className="text-xs text-gray-500">Contrôle l’affichage côté voyageurs</p>
                      </div>
                      <Switch
                        checked={draftListing.isAvailable}
                        onCheckedChange={(checked) => handleFieldChange('isAvailable', checked)}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailLine icon={DollarSign} label="Tarif" value={`${listing.price.toLocaleString('fr-FR')} FCFA`} />
                  <DetailLine
                    icon={Shield}
                    label="Caution"
                    value={listing.depositAmount ? priceFormatter.format(listing.depositAmount) : 'Non renseignée'}
                  />
                  <DetailLine
                    icon={Clock4}
                    label="Séjour minimum"
                    value={listing.minLeaseMonths ? `${listing.minLeaseMonths} nuits` : 'Non précisé'}
                  />
                  <DetailLine icon={Users} label="Capacité" value={`${listing.guestCapacity} voyageurs`} />
                  {listing.isCommercial && (
                    <DetailLine icon={Maximize2} label="Surface" value={listing.surfaceArea ? `${listing.surfaceArea} m²` : '—'} />
                  )}
                  <DetailLine
                    icon={CheckCircle2}
                    label="Statut"
                    value={listing.isAvailable ? 'Active' : 'Désactivée'}
                    accent={listing.isAvailable ? 'text-emerald-600' : 'text-orange-600'}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Performances</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ListingStat icon={Eye} label="Vues cumulées" value={listing.viewsCount.toLocaleString('fr-FR')} />
                <ListingStat icon={MessageSquare} label="Commentaires" value={listing.commentsCount.toLocaleString('fr-FR')} />
                <ListingStat icon={CalendarCheck} label="Visites planifiées" value={`${listing.visits}`} />
                <ListingStat icon={UserCheck} label="Séjours confirmés" value={`${listing.bookings}`} />
                <ListingStat icon={Star} label="Avis logement" value={`${listing.rating?.toFixed(2) ?? '—'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuration des pièces</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roomLabelMap).map(([key, label]) => (
                  <RoomBadge
                    key={key}
                    label={label}
                    value={listing.roomBreakdown[key as keyof typeof roomLabelMap]}
                    isEditing={isEditing}
                    onChange={(value) =>
                      handleRoomBreakdownChange(key as keyof HostListingDetail['roomBreakdown'], value)
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Bibliothèque média</h2>
                  <p className="text-sm text-gray-500">Photos & vidéos fournies par l’hôte</p>
                </div>
                <Badge variant="outline" className="rounded-full">
                  {listing.mediaAssets.length} éléments
                </Badge>
              </div>
              {isEditing && (
                <Button variant="outline" className="rounded-xl flex items-center gap-2" onClick={handleMediaAdd}>
                  <Plus className="w-4 h-4" />
                  Ajouter un média
                </Button>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {listing.mediaAssets.map((asset) => (
                  <MediaItemCard key={asset.id} asset={asset} isEditing={isEditing} onRemove={handleMediaRemove} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Équipements</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((item) => (
                  <Badge key={item} variant="secondary" className="rounded-full text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Hôte</h2>
              <div className="space-y-3">
                <ContactLine icon={<UserIcon className="w-4 h-4" />} label="Nom complet" value={listing.owner} />
                <ContactLine icon={<AtSign className="w-4 h-4" />} label="Nom d’utilisateur" value={listing.ownerUsername} />
                <ContactLine icon={<Phone className="w-4 h-4" />} label="Téléphone" value={listing.ownerPhone} />
              </div>
              <div className="flex flex-col gap-3">
                <Button className="rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]">
                  <Phone className="w-4 h-4 mr-2" />
                  Contacter l’hôte
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={!canViewHostProfile}
                  onClick={() => listing.ownerProfileId && onViewHostProfile?.(listing.ownerProfileId)}
                >
                  Voir profil hôte
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Actions rapides</h2>
              <div className="flex flex-col gap-3">
                <Button
                  variant="secondary"
                  className="rounded-xl flex items-center gap-2"
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing}
                >
                  <Pencil className="w-4 h-4" />
                  Modifier le contenu
                </Button>
                <Button variant="destructive" className="rounded-xl flex items-center gap-2">
                  <ShieldOff className="w-4 h-4" />
                  Suspendre l’annonce
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Notes internes</h2>
              <p className="text-sm text-gray-600">{listing.notes}</p>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

function ListingStat({
  icon: Icon,
  label,
  value,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 space-y-2">
      {Icon && (
        <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ContactLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label?: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-gray-700">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <div>
        {label && <p className="text-xs uppercase text-gray-500">{label}</p>}
        <p className="text-sm font-medium text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function getStatusLabel(status: HostListingDetail['status']) {
  const labels: Record<HostListingDetail['status'], string> = {
    pending: 'En attente',
    approved: 'Approuvée',
    rejected: 'Refusée',
    suspended: 'Suspendue',
  };
  return labels[status];
}

type InfoChipProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: 'success' | 'warning';
};

function InfoChip({ icon: Icon, label, value, tone }: InfoChipProps) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-600 bg-emerald-50'
      : tone === 'warning'
      ? 'text-orange-600 bg-orange-50'
      : 'text-gray-900 bg-white';

  return (
    <div className={`rounded-2xl border border-gray-100 p-4 flex flex-col gap-1 ${tone ? '' : ''}`}>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className={`text-lg font-semibold ${tone ? toneClass : ''}`}>{value}</div>
    </div>
  );
}

type DetailLineProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  stacked?: boolean;
  accent?: string;
};

function DetailLine({ icon: Icon, label, value, stacked = false, accent }: DetailLineProps) {
  return (
    <div className={stacked ? 'flex items-start gap-3' : 'flex items-center gap-3'}>
      <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-sm font-medium text-gray-900 mt-0.5 ${accent ?? ''}`}>{value}</p>
      </div>
    </div>
  );
}

const roomLabelMap = {
  livingRoom: 'Salon',
  bedrooms: 'Chambres',
  kitchens: 'Cuisines',
  bathrooms: 'Salles de bain',
  diningRooms: 'Salles à manger',
  toilets: 'Toilettes',
} as const;

type EditableFieldProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
};

function EditableField({ label, icon: Icon, inputProps }: EditableFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-gray-600 flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </Label>
      <Input className="rounded-xl" {...inputProps} />
    </div>
  );
}

type RoomBadgeProps = {
  label: string;
  value: number;
  isEditing?: boolean;
  onChange?: (value: string) => void;
};

function RoomBadge({ label, value, isEditing = false, onChange }: RoomBadgeProps) {
  return (
    <div className="px-3 py-2 rounded-2xl border border-gray-200 bg-white flex items-center gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      {isEditing && onChange ? (
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-20 h-9 rounded-xl"
        />
      ) : (
        <span className="font-semibold text-gray-900">{value}</span>
      )}
    </div>
  );
}

type MediaItemCardProps = {
  asset: HostListingDetail['mediaAssets'][number];
  isEditing?: boolean;
  onRemove?: (assetId: string) => void;
};

function MediaItemCard({ asset, isEditing = false, onRemove }: MediaItemCardProps) {
  const Icon = asset.type === 'video' ? Video : Images;
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${asset.thumbnailUrl})` }} />
      <div className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon className="w-4 h-4" />
          {asset.type === 'video' ? 'Vidéo' : 'Photo'}
          {asset.room && <Badge variant="secondary">{asset.room}</Badge>}
        </div>
        <p className="font-medium text-gray-900">{asset.label}</p>
        {asset.durationSeconds && (
          <p className="text-xs text-gray-500">Durée {formatDuration(asset.durationSeconds)}</p>
        )}
        {isEditing && onRemove && (
          <div className="pt-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-red-600 flex items-center gap-2 px-2">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce média ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action retirera l’élément de la fiche annonce.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onRemove(asset.id)}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

