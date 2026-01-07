import {
  useEffect,
  useState,
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { HostListingDetail } from '../../UsersManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  ArrowLeft,
  ShieldOff,
  Pencil,
  Home,
  DollarSign,
  Users,
  Maximize2,
  CheckCircle2,
  Eye,
  MessageSquare,
  Heart,
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
      icon: Users,
      label: 'Capacité',
      value: `${listing.guestCapacity} voyageurs`,
    },
    {
      icon: CheckCircle2,
      label: 'Statut',
      value: getStatusLabel(listing.status, listing.statusLabel),
      tone: getStatusBadgeTone(listing.status, listing.statusLabel),
    },
  ];

  if (listing.isCommercial) {
    infoChips.splice(5, 0, {
      icon: Maximize2,
      label: 'Surface',
      value: listing.surfaceArea ? `${listing.surfaceArea} m²` : '—',
    });
  }

function getStatusBadgeTone(status: HostListingDetail['status'], raw?: string): InfoChipProps['tone'] {
  const normalized = raw?.toLowerCase().trim() ?? '';
  if (normalized.includes('online') || normalized.includes('ligne') || status === 'approved') {
    return 'success';
  }
  if (normalized.includes('draft') || normalized.includes('brouillon') || status === 'pending') {
    return 'warning';
  }
  return undefined;
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
          <div
            className="relative flex items-center justify-center bg-gray-900 overflow-hidden"
            style={{ aspectRatio: '4 / 3', maxHeight: '340px' }}
          >
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
              <Badge className={statusBadgeStyles[listing.status]}>
                {getStatusLabel(listing.status, listing.statusLabel)}
              </Badge>
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

      <Card className="rounded-2xl border-gray-100">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Performances</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            <ListingStat icon={Eye} label="Vues cumulées" value={listing.viewsCount.toLocaleString('fr-FR')} />
            <ListingStat icon={MessageSquare} label="Commentaires" value={listing.commentsCount.toLocaleString('fr-FR')} />
            <ListingStat icon={Heart} label="Likes" value={listing.likesCount?.toLocaleString('fr-FR') ?? '0'} />
            <ListingStat icon={CalendarCheck} label="Visites planifiées" value={`${listing.visits}`} />
            <ListingStat icon={UserCheck} label="Séjours confirmés" value={`${listing.bookings}`} />
            <ListingStat icon={Star} label="Note moyenne" value={`${listing.rating?.toFixed(2) ?? '—'}`} />
            <ListingStat icon={UserIcon} label="Nombre d’avis" value={`${listing.reviewsCount ?? 0}`} />
          </div>
        </CardContent>
      </Card>

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

function getStatusLabel(status: HostListingDetail['status'], raw?: string) {
  const normalized = raw?.toLowerCase().trim() ?? '';
  if (normalized.includes('online') || normalized.includes('ligne') || normalized.includes('approuv') || normalized.includes('publish')) {
    return 'En ligne';
  }
  if (normalized.includes('draft') || normalized.includes('brouillon') || normalized.includes('pending') || normalized.includes('attente')) {
    return 'Brouillon';
  }
  const labels: Record<HostListingDetail['status'], string> = {
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
  asset: HostListingDetail['mediaAssets'][number];
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

