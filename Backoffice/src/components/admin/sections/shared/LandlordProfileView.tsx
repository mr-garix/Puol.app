import { useMemo, useState, type ReactNode } from 'react';
import type { LandlordProfileDetail } from '../../UsersManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Eye,
  DollarSign,
  ShieldOff,
  UserMinus,
  Heart,
  MessageCircle,
  UserCheck,
  Pencil
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type LandlordProfileViewProps = {
  landlord: LandlordProfileDetail;
  onBack: () => void;
};

const leaseStatusStyles: Record<
  LandlordProfileDetail['leases'][number]['status'],
  { label: string; className: string }
> = {
  actif: { label: 'Actif', className: 'bg-emerald-100 text-emerald-700' },
  terminé: { label: 'Terminé', className: 'bg-gray-100 text-gray-700' },
  'en préparation': { label: 'En préparation', className: 'bg-amber-100 text-amber-700' }
};

const listingStatusStyles: Record<
  LandlordProfileDetail['listings'][number]['status'],
  { label: string; className: string }
> = {
  'en ligne': { label: 'En ligne', className: 'bg-emerald-50 text-emerald-700' },
  'en brouillon': { label: 'En brouillon', className: 'bg-amber-50 text-amber-700' }
};

const timelineColors: Record<
  LandlordProfileDetail['timeline'][number]['type'],
  { bg: string; dot: string }
> = {
  lease: { bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  moderation: { bg: 'bg-sky-50', dot: 'bg-sky-500' },
  payment: { bg: 'bg-purple-50', dot: 'bg-purple-500' }
};

type MockTenantProfile = {
  id: string;
  name: string;
  phone: string;
  preferredListingId?: string;
};

type AssignmentPreview = {
  tenantName: string;
  tenantPhone: string;
  listingTitle: string;
  listingCity: string;
  startDate: string;
  endDate?: string;
};

const mockTenantProfiles: MockTenantProfile[] = [
  {
    id: 'CL-9042',
    name: 'Amina Kouadio',
    phone: '+225 07 58 45 12 03',
    preferredListingId: 'LIST-204',
  },
  {
    id: 'CL-7781',
    name: 'Jean-Marc Dago',
    phone: '+225 05 49 11 66 42',
  },
  {
    id: 'CL-6610',
    name: 'Clarisse Yadé',
    phone: '+225 01 23 88 90 70',
    preferredListingId: 'LIST-209',
  },
  {
    id: 'CL-5534',
    name: 'Fabrice Gnahoré',
    phone: '+225 07 68 14 52 77',
  },
  {
    id: 'CL-4108',
    name: 'Prisca Kouamé',
    phone: '+225 05 20 11 44 01',
  },
];

export function LandlordProfileView({ landlord, onBack }: LandlordProfileViewProps) {
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<MockTenantProfile | null>(null);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [assignmentPreview, setAssignmentPreview] = useState<AssignmentPreview | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const tenantSuggestions = useMemo(() => {
    const normalized = tenantSearch.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return mockTenantProfiles
      .filter((tenant) =>
        `${tenant.name} ${tenant.phone}`.toLowerCase().includes(normalized),
      )
      .slice(0, 6);
  }, [tenantSearch]);

  const selectedListing = landlord.listings.find((listing) => listing.id === selectedListingId);
  const hasTenantSearch = tenantSearch.trim().length > 0;

  const handleSelectTenant = (tenant: MockTenantProfile) => {
    setSelectedTenant(tenant);
    setTenantSearch(tenant.name);
    if (tenant.preferredListingId && landlord.listings.some((listing) => listing.id === tenant.preferredListingId)) {
      setSelectedListingId(tenant.preferredListingId);
    }
  };

  const handleAssignTenant = () => {
    if (!selectedTenant || !selectedListingId || !leaseStartDate) {
      return;
    }

    const listing = landlord.listings.find((item) => item.id === selectedListingId);

    if (!listing) {
      return;
    }

    setAssignmentPreview({
      tenantName: selectedTenant.name,
      tenantPhone: selectedTenant.phone,
      listingTitle: listing.title,
      listingCity: listing.city,
      startDate: leaseStartDate,
      endDate: leaseEndDate || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux bailleurs
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2ECC71] via-[#27AE60] to-[#1A7743] text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setIsProfileDialogOpen(true)}
              className="relative outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A7743] rounded-full transition-transform hover:scale-105"
            >
              <Avatar className="size-28 border-4 border-white/30">
                <AvatarImage src={landlord.avatarUrl} alt={landlord.name} />
                <AvatarFallback className="text-lg">{landlord.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </button>
            <div>
              <p className="text-white/70 text-sm uppercase">{landlord.segment.toUpperCase()}</p>
              <h1 className="text-3xl font-semibold">{landlord.name}</h1>
              <p className="text-white/80">{landlord.username} · {landlord.city}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" className="rounded-xl">
              <ShieldOff className="w-4 h-4 mr-2" />
              Suspendre le compte
            </Button>
            <Button
              variant="secondary"
              className="bg-white text-[#27AE60] hover:bg-white/90 rounded-xl border-none"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Retirer comme bailleur
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
          <ProfileStat label="Baux signés" value={landlord.leasesSigned.toString()} />
          <ProfileStat label="Biens gérés" value={landlord.unitsManaged.toString()} />
          <ProfileStat label="Locataires actifs" value={landlord.tenantsTotal.toString()} />
          <ProfileStat
            label="Revenus générés"
            value={`${landlord.revenueShare.toLocaleString('fr-FR')} FCFA`}
          />
        </div>
      </div>

      <Card className="rounded-3xl border-gray-100">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatBubble
            icon={<Eye className="w-4 h-4" />}
            label="Vues totales"
            value={landlord.stats.views}
            accent={{
              container: 'bg-gradient-to-br from-[#E8FFF5] to-[#C1FFD9]',
              icon: 'bg-white text-emerald-500',
              value: 'text-emerald-700',
            }}
          />
          <StatBubble
            icon={<Heart className="w-4 h-4" />}
            label="Likes"
            value={landlord.stats.likes}
            accent={{
              container: 'bg-gradient-to-br from-[#FFE8F1] to-[#FFC7DA]',
              icon: 'bg-white text-rose-500',
              value: 'text-rose-700',
            }}
          />
          <StatBubble
            icon={<MessageCircle className="w-4 h-4" />}
            label="Commentaires"
            value={landlord.stats.comments}
            accent={{
              container: 'bg-gradient-to-br from-[#E8F4FF] to-[#C8E2FF]',
              icon: 'bg-white text-sky-500',
              value: 'text-sky-700',
            }}
          />
          <StatBubble
            icon={<UserCheck className="w-4 h-4" />}
            label="Visites reçues"
            value={landlord.stats.visits}
            accent={{
              container: 'bg-gradient-to-br from-[#F5E8FF] to-[#DEC7FF]',
              icon: 'bg-white text-purple-500',
              value: 'text-purple-700',
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-start">
        <div className="space-y-6 order-1 lg:order-1">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Baux longue durée" description="Suivi des signatures et locataires actifs" />
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60">
                    <TableHead>Bail</TableHead>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {landlord.leases.map((lease) => {
                    const status = leaseStatusStyles[lease.status];
                    return (
                      <TableRow key={lease.id}>
                        <TableCell className="font-medium text-gray-900">{lease.unit}</TableCell>
                        <TableCell>{lease.tenant}</TableCell>
                        <TableCell>{lease.startDate}</TableCell>
                        <TableCell>{lease.duration}</TableCell>
                        <TableCell>{lease.value}</TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs rounded-full px-3 py-1', status.className)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Annonces publiées" description="Statuts, modération et actions rapides" />
              <div className="grid gap-4 md:grid-cols-2">
                {landlord.listings.map((listing) => {
                  const status = listingStatusStyles[listing.status];
                  return (
                    <div key={listing.id} className="rounded-xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0"
                          style={{ backgroundImage: `url(${listing.previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{listing.title}</p>
                            </div>
                            <Badge className={cn('rounded-full text-xs', status.className)}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {listing.city} · {listing.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-900">
                        <span className="font-medium">{listing.price}</span>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {listing.viewCount?.toLocaleString('fr-FR') ?? '0'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {listing.commentCount?.toLocaleString('fr-FR') ?? '0'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {listing.likeCount?.toLocaleString('fr-FR') ?? '0'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" className="rounded-lg flex-1">
                          <Eye className="w-4 h-4 mr-1" />
                          Aperçu
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-lg flex-1">
                          <Pencil className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6 order-3 lg:order-2">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Contact & statut" description="Coordonnées vérifiées côté back-office" />
              <div className="space-y-3">
                <ContactLine icon={<Phone className="w-4 h-4" />} value={landlord.phone} />
                <ContactLine icon={<MapPin className="w-4 h-4" />} value={landlord.address} />
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button variant="outline" className="rounded-xl flex-1">
                  Contacter
                </Button>
                <Button variant="outline" className="rounded-xl flex-1">
                  Ajouter une note
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Actions rapides" description="Modération, baux et accès app" />
              <div className="space-y-3">
                <QuickAction label="Envoyer relevé" detail="Inclut revenus, frais PUOL et dettes éventuelles" />
              </div>
              <Button className="w-full rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]">
                <DollarSign className="w-4 h-4 mr-2" />
                Demander un virement
              </Button>
            </CardContent>
          </Card>

        </div>

        <Card className="rounded-2xl border-gray-100 order-2 lg:order-3 lg:col-span-2">
          <CardContent className="p-6 space-y-5">
            <SectionHeader
              title="Assignation du bail"
              description="Associez un locataire à une annonce du bailleur et définissez les dates clés."
            />

            <div className="flex flex-wrap items-center gap-3">
              {assignmentPreview ? (
                <Badge variant="secondary" className="rounded-full text-sm bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="font-semibold">{assignmentPreview.tenantName}</span>
                  <span className="mx-2 text-emerald-400">·</span>
                  {assignmentPreview.listingTitle}
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full text-xs text-gray-500">
                  Aucun bail assigné pour l’instant
                </Badge>
              )}

              {assignmentPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-gray-500 hover:text-gray-900"
                  onClick={() => {
                    setAssignmentPreview(null);
                    setSelectedTenant(null);
                    setTenantSearch('');
                    setLeaseStartDate('');
                    setLeaseEndDate('');
                  }}
                >
                  Réinitialiser
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label className="text-sm text-gray-600" htmlFor="tenant-search">
                  Rechercher un profil locataire
                </Label>
                <div className="relative">
                  <Input
                    id="tenant-search"
                    value={tenantSearch}
                    onChange={(event) => {
                      setTenantSearch(event.target.value);
                      setSelectedTenant(null);
                    }}
                    placeholder="Saisir un nom, un numéro"
                    className="pl-10 rounded-xl"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {hasTenantSearch ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 space-y-2">
                    {tenantSuggestions.length ? (
                      tenantSuggestions.map((tenant) => {
                        const isSelected = selectedTenant?.id === tenant.id;
                        return (
                          <button
                            key={tenant.id}
                            type="button"
                            onClick={() => handleSelectTenant(tenant)}
                            className={cn(
                              'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                              isSelected
                                ? 'bg-white shadow-sm border border-emerald-200 text-emerald-700'
                                : 'hover:bg-white/70',
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{tenant.name}</p>
                                <p className="text-xs text-gray-500">{tenant.phone}</p>
                              </div>
                              {isSelected && (
                                <Badge variant="outline" className="rounded-full text-[11px] text-emerald-600 border-emerald-200">
                                  Sélectionné
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-500">
                        Aucun profil ne correspond à cette recherche.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Commencez à saisir un nom ou un numéro pour afficher des suggestions.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600">Annonce à signer</Label>
                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                  <SelectTrigger className="rounded-xl text-left">
                    <SelectValue placeholder="Choisir une annonce" />
                  </SelectTrigger>
                  <SelectContent>
                    {landlord.listings.map((listing) => (
                      <SelectItem key={listing.id} value={listing.id}>
                        <span className="block text-sm font-medium text-gray-900">{listing.title}</span>
                        <span className="block text-xs text-gray-500">{listing.city} • {listing.type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedListing && (
                  <p className="text-xs text-gray-500">
                    {selectedListing.city} · {selectedListing.price}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600" htmlFor="lease-start">Début du bail</Label>
                <Input
                  id="lease-start"
                  type="date"
                  value={leaseStartDate}
                  onChange={(event) => setLeaseStartDate(event.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-600" htmlFor="lease-end">Fin du bail (optionnel)</Label>
                <Input
                  id="lease-end"
                  type="date"
                  value={leaseEndDate}
                  onChange={(event) => setLeaseEndDate(event.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-500">
                Choisissez le locataire, l’annonce concernée et la période pour préparer la signature du bail.
              </p>
              <Button
                className="rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]"
                onClick={handleAssignTenant}
                disabled={!selectedTenant || !selectedListingId || !leaseStartDate}
              >
                Valider l’assignation
              </Button>
            </div>

            {assignmentPreview && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 text-sm text-emerald-800">
                <p className="font-semibold text-emerald-900">Résumé de l’assignation</p>
                <ul className="space-y-1">
                  <li>
                    <span className="font-medium">Locataire :</span> {assignmentPreview.tenantName} ({assignmentPreview.tenantPhone})
                  </li>
                  <li>
                    <span className="font-medium">Annonce :</span> {assignmentPreview.listingTitle} · {assignmentPreview.listingCity}
                  </li>
                  <li>
                    <span className="font-medium">Période :</span> {assignmentPreview.startDate}
                    {assignmentPreview.endDate ? ` → ${assignmentPreview.endDate}` : ' (en cours)'}
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-100 order-4 lg:order-4 lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <SectionHeader title="Historique & signalements" description="Suivi chronologique des actions" />
            <div className="space-y-4">
              {landlord.timeline.map((event) => {
                const colors = timelineColors[event.type];
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'rounded-2xl p-4 flex items-start gap-4',
                      colors.bg
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full mt-2', colors.dot)} />
                    <div>
                      <p className="text-xs uppercase text-gray-500">{event.date}</p>
                      <p className="text-sm font-semibold text-gray-900">{event.label}</p>
                      <p className="text-sm text-gray-600">{event.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-2xl w-[90vw] bg-transparent border-none shadow-none p-0">
          <div className="relative rounded-3xl overflow-hidden">
            <Avatar className="w-full h-auto">
              <AvatarImage src={landlord.avatarUrl} alt={landlord.name} className="w-full h-full object-cover" />
              <AvatarFallback className="text-6xl bg-emerald-100 text-emerald-700 py-24">
                {landlord.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/10">
      <p className="text-xs uppercase text-white/70">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function StatBubble({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent: { container: string; icon: string; value: string };
}) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 flex items-center gap-3 border border-transparent shadow-sm',
        accent.container,
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', accent.icon)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={cn('text-2xl font-semibold', accent.value)}>
          {value.toLocaleString('fr-FR')}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function ContactLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-700">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <span>{value}</span>
    </div>
  );
}

function QuickAction({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}
