import { useEffect, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import type { LandlordListingDetail } from '../../UsersManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ShieldOff,
  Pencil,
  Home,
  DollarSign,
  Shield,
  Maximize2,
  CheckCircle2,
  Clock4,
  Eye,
  MessageSquare,
  CalendarCheck,
  UserCheck,
  Heart,
  Video,
  Images,
  Plus,
  Trash2,
  AtSign,
  Phone,
  User as UserIcon,
} from 'lucide-react';

type LandlordListingDetailViewProps = {
  listing: LandlordListingDetail;
  onBack: () => void;
  onViewLandlordProfile?: (landlordId: string) => void;
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

export function LandlordListingDetailView({ listing: initialListing, onBack, onViewLandlordProfile }: LandlordListingDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentListing, setCurrentListing] = useState(initialListing);
  const [draftListing, setDraftListing] = useState(initialListing);
  const [assignedTenant, setAssignedTenant] = useState(initialListing.currentTenant ?? '');
  const [tenantInput, setTenantInput] = useState('');
  const [assignedLeaseStart, setAssignedLeaseStart] = useState(initialListing.currentLeaseStart ?? '');
  const [assignedLeaseEnd, setAssignedLeaseEnd] = useState(initialListing.currentLeaseEnd ?? '');
  const [leaseStartInput, setLeaseStartInput] = useState('');
  const [leaseEndInput, setLeaseEndInput] = useState('');

  useEffect(() => {
    setCurrentListing(initialListing);
    setDraftListing(initialListing);
    setIsEditing(false);
    setAssignedTenant(initialListing.currentTenant ?? '');
    setTenantInput('');
    setAssignedLeaseStart(initialListing.currentLeaseStart ?? '');
    setAssignedLeaseEnd(initialListing.currentLeaseEnd ?? '');
    setLeaseStartInput('');
    setLeaseEndInput('');
  }, [initialListing]);

  const listing = isEditing ? draftListing : currentListing;
  const canViewLandlordProfile = Boolean(onViewLandlordProfile && listing.ownerProfileId);

  const handleFieldChange = <K extends keyof LandlordListingDetail>(field: K, value: LandlordListingDetail[K]) => {
    setDraftListing((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRoomBreakdownChange = (roomKey: keyof LandlordListingDetail['roomBreakdown'], value: string) => {
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
  const handleAssignTenant = () => {
    const trimmed = tenantInput.trim();
    if (!trimmed || !leaseStartInput) return;
    setAssignedTenant(trimmed);
    setAssignedLeaseStart(leaseStartInput);
    setAssignedLeaseEnd(leaseEndInput);
    setTenantInput('');
    setLeaseStartInput('');
    setLeaseEndInput('');
  };
  const handleClearTenant = () => {
    setAssignedTenant('');
    setAssignedLeaseStart('');
    setAssignedLeaseEnd('');
  };

  const fallbackAddress =
    [listing.district, listing.city].filter((value) => Boolean(value?.trim())).join(' · ') || 'Localisation non renseignée';

  const fullAddress = listing.formattedAddress ?? listing.addressText ?? fallbackAddress;

  const infoChips: InfoChipProps[] = [
    {
      icon: Home,
      label: 'Type de bien',
      value: listing.propertyType,
    },
    {
      icon: DollarSign,
      label: 'Loyer mensuel',
      value: priceFormatter.format(listing.price),
    },
    {
      icon: Shield,
      label: 'Caution',
      value: listing.depositAmount ? priceFormatter.format(listing.depositAmount) : 'Non renseignée',
    },
    {
      icon: Clock4,
      label: 'Durée minimale',
      value: listing.minLeaseMonths ? `${listing.minLeaseMonths} mois` : 'Non précisée',
    },
    {
      icon: CheckCircle2,
      label: 'Disponibilité',
      value: listing.isAvailable ? 'Publiée' : 'Brouillon',
      tone: listing.isAvailable ? 'success' : 'warning',
    },
  ];
  infoChips.splice(5, 0, {
    icon: Maximize2,
    label: listing.surfaceArea ? 'Surface' : 'Durée min.',
    value: listing.surfaceArea ? `${listing.surfaceArea} m²` : (listing.minLeaseMonths ? `${listing.minLeaseMonths} mois` : '—'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux annonces
        </Button>
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
          <div
            className="relative flex items-center justify-center bg-gray-900 overflow-hidden"
            style={{ aspectRatio: '4 / 3', maxHeight: '340px' }}
          >
            <img
              src={listing.coverUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white space-y-2">
              <p className="text-sm uppercase tracking-wide text-white/70">Couverture</p>
              <p className="text-lg font-semibold">{listing.city} · {listing.district}</p>
            </div>
          </div>
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[11px] uppercase text-gray-500 tracking-wide">Titre annonce</p>
                <h1 className="text-xl font-semibold text-gray-900 leading-tight">{listing.title}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusBadgeStyles[listing.status]}>{getStatusLabel(listing.status)}</Badge>
              <Badge variant="outline" className="rounded-full">{listing.propertyType}</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase text-gray-500">Tarification</p>
              <p className="text-xl font-semibold text-gray-900 leading-tight">
                {listing.price.toLocaleString('fr-FR')} FCFA
                <span className="text-xs font-medium text-gray-500"> / {listing.priceType}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-[10px] uppercase text-gray-500">
                  {listing.surfaceArea ? 'Surface' : 'Durée min.'}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {listing.surfaceArea ? `${listing.surfaceArea} m²` : (listing.minLeaseMonths ? `${listing.minLeaseMonths} mois` : '—')}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-3">
                <p className="text-[10px] uppercase text-gray-500">Caution</p>
                <p className="text-sm font-semibold text-gray-900">
                  {listing.depositAmount ? priceFormatter.format(listing.depositAmount) : '—'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-100 p-3 text-xs">
              <p className="text-[10px] uppercase text-gray-500">Adresse</p>
              <p className="text-[13px] font-semibold text-gray-900">
                {fullAddress}
              </p>
            </div>
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
                  placeholder="Décrivez les points forts du bien..."
                />
              ) : (
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Performances</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <ListingStat icon={Eye} label="Vues totales" value={listing.viewsCount.toLocaleString('fr-FR')} />
                <ListingStat icon={MessageSquare} label="Commentaires" value={listing.commentsCount.toLocaleString('fr-FR')} />
                <ListingStat icon={CalendarCheck} label="Visites" value={`${listing.visits}`} />
                <ListingStat icon={UserCheck} label="Baux signés" value={`${listing.bookings}`} />
                <ListingStat icon={Heart} label="Likes" value={(listing.likesCount ?? 0).toLocaleString('fr-FR')} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Configuration des pièces</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(roomLabelMap)
                  .filter(([key]) => {
                    const count = listing.roomBreakdown[key as keyof typeof roomLabelMap] ?? 0;
                    return isEditing || count > 0;
                  })
                  .map(([key, label]) => (
                    <RoomBadge
                      key={key}
                      label={label}
                      value={listing.roomBreakdown[key as keyof typeof roomLabelMap]}
                      isEditing={isEditing}
                      onChange={(value) =>
                        handleRoomBreakdownChange(key as keyof LandlordListingDetail['roomBreakdown'], value)
                      }
                    />
                  ))}
                {!isEditing &&
                  Object.values(listing.roomBreakdown).every((count) => !count || count <= 0) && (
                    <p className="text-sm text-gray-500">Aucune donnée disponible pour cette annonce.</p>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Bibliothèque média</h2>
                  <p className="text-sm text-gray-500">Photos et vidéos fournies par le bailleur</p>
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
                {listing.mediaAssets.length > 0 ? (
                  listing.mediaAssets.map((asset) => (
                    <MediaItemCard
                      key={asset.id}
                      asset={asset}
                      isEditing={isEditing}
                      onRemove={handleMediaRemove}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Images className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Aucun média disponible pour cette annonce</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {listing.amenities.length > 0 ? (
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
          ) : (
            <Card className="rounded-2xl border-gray-100">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Équipements</h2>
                <div className="text-center py-8 text-gray-500">
                  <Home className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">Aucun équipement renseigné pour cette annonce</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Bailleur</h2>
              <div className="space-y-3">
                <ContactLine
                  icon={<UserIcon className="w-4 h-4" />}
                  label="Nom complet"
                  value={listing.owner}
                />
                <ContactLine
                  icon={<AtSign className="w-4 h-4" />}
                  label="Nom d'utilisateur"
                  value={listing.ownerUsername}
                />
                <ContactLine
                  icon={<Phone className="w-4 h-4" />}
                  label="Téléphone"
                  value={listing.ownerPhone}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button className="rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]">
                  <Phone className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={!canViewLandlordProfile}
                  onClick={() => listing.ownerProfileId && onViewLandlordProfile?.(listing.ownerProfileId)}
                >
                  Voir profil bailleur
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
      <Card className="rounded-2xl border-gray-100">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Assignation locataire</h2>
              <p className="text-sm text-gray-500">Suivez qui occupe actuellement le bien et mettez à jour au besoin.</p>
            </div>
            {assignedTenant ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full text-sm">
                  Loué par&nbsp;<span className="font-semibold text-gray-900 ml-1">{assignedTenant}</span>
                </Badge>
                {assignedLeaseStart && (
                  <Badge variant="outline" className="rounded-full text-xs">
                    {formatLeasePeriod(assignedLeaseStart, assignedLeaseEnd)}
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="rounded-full text-xs text-gray-500">
                Aucun locataire assigné
              </Badge>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]">
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">Locataire</Label>
              <Input
                placeholder="Rechercher ou saisir le nom du locataire"
                value={tenantInput}
                onChange={(event) => setTenantInput(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">Début du bail</Label>
              <Input type="date" value={leaseStartInput} onChange={(event) => setLeaseStartInput(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-600">Fin du bail (optionnel)</Label>
              <Input type="date" value={leaseEndInput} onChange={(event) => setLeaseEndInput(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAssignTenant} className="w-full" disabled={!tenantInput.trim() || !leaseStartInput}>
                Assigner
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>
              {assignedTenant
                ? `Occupation confirmée ${formatLeasePeriod(assignedLeaseStart, assignedLeaseEnd)}`
                : 'Ajoutez un locataire, définissez sa période de location puis assignez-le.'}
            </p>
            {assignedTenant && (
              <Button variant="ghost" size="sm" className="text-red-500" onClick={handleClearTenant}>
                Libérer le bien
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
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
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
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

function getStatusLabel(status: LandlordListingDetail['status']) {
  const labels: Record<LandlordListingDetail['status'], string> = {
    pending: 'Brouillon',
    approved: 'En ligne',
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

const roomLabelMap = {
  livingRoom: 'Salon',
  bedrooms: 'Chambres',
  kitchens: 'Cuisines',
  bathrooms: 'Salles de bain',
  diningRooms: 'Salles à manger',
  toilets: 'Toilettes',
} as const;

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
  asset: LandlordListingDetail['mediaAssets'][number];
  isEditing?: boolean;
  onRemove?: (assetId: string) => void;
};

function MediaItemCard({ asset, isEditing = false, onRemove }: MediaItemCardProps) {
  const Icon = asset.type === 'video' ? Video : Images;
  const isVideo = asset.type === 'video' && Boolean(asset.sourceUrl);
  const previewSrc = asset.sourceUrl ?? asset.thumbnailUrl;

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="relative flex w-full items-center justify-center bg-gray-900 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            style={{ aspectRatio: '9 / 16', minHeight: '270px', maxHeight: '380px' }}
          >
            {isVideo ? (
              <video
                className="h-full w-full object-cover"
                controls={false}
                muted
                autoPlay
                loop
                playsInline
                preload="auto"
                poster={asset.thumbnailUrl}
                src={asset.sourceUrl ?? undefined}
              />
            ) : (
              <img src={asset.thumbnailUrl} alt={asset.label} className="h-full w-full object-cover" />
            )}
            <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-black/30">
              Prévisualiser
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="w-[min(90vw,900px)] max-w-[900px] border-none bg-transparent p-0">
          <div className="w-full rounded-2xl bg-black p-4 flex items-center justify-center">
            {isVideo ? (
              <video
                src={asset.sourceUrl ?? undefined}
                poster={asset.thumbnailUrl}
                controls
                autoPlay
                className="max-h-[80vh] w-full max-w-full object-contain"
              />
            ) : (
              <img src={previewSrc} alt={asset.label} className="max-h-[80vh] w-full max-w-full object-contain" />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icon className="w-4 h-4" />
          {isVideo ? 'Vidéo' : 'Photo'}
          {asset.room && <Badge variant="secondary">{asset.room}</Badge>}
        </div>
        <p className="font-medium text-gray-900">{asset.label}</p>
        {asset.durationSeconds && (
          <p className="text-xs text-gray-500">Durée {formatDuration(asset.durationSeconds)}</p>
        )}
        {asset.sourceUrl && !isVideo && (
          <a
            href={asset.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            Ouvrir le média
          </a>
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

function formatLeasePeriod(start?: string | null, end?: string | null) {
  if (!start) return '';

  const formatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedStart = formatter.format(new Date(start));
  if (!end) {
    return `Depuis le ${formattedStart} (en cours)`;
  }
  const formattedEnd = formatter.format(new Date(end));
  return `Du ${formattedStart} au ${formattedEnd}`;
}
