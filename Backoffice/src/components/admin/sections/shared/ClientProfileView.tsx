import type {
  ClientProfileDetail,
  ClientLeaseRecord,
  ClientTimelineEvent,
  ClientVisitRecord,
} from '../../UsersManagement';
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
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  Wallet,
  MessageSquare,
  ShieldCheck,
  Users,
  Sparkles,
  Heart,
  Eye,
  Clock4,
  Calendar,
  Pin,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

type ClientProfileViewProps = {
  client: ClientProfileDetail;
  onBack: () => void;
};

const timelineColors: Record<
  ClientTimelineEvent['type'],
  { bg: string; dot: string; accent: string }
> = {
  reservation: { bg: 'bg-blue-50', dot: 'bg-blue-500', accent: 'text-blue-800' },
  visit: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', accent: 'text-emerald-800' },
  payment: { bg: 'bg-purple-50', dot: 'bg-purple-500', accent: 'text-purple-800' },
  support: { bg: 'bg-rose-50', dot: 'bg-rose-500', accent: 'text-rose-800' },
};

const statusChips: Record<ClientLeaseRecord['status'], string> = {
  signé: 'bg-emerald-100 text-emerald-700',
  'en cours': 'bg-sky-100 text-sky-700',
  clos: 'bg-gray-100 text-gray-700',
};

const visitStatuses: Record<ClientVisitRecord['status'], string> = {
  confirmée: 'text-emerald-600',
  'en attente': 'text-amber-600',
  terminée: 'text-gray-500',
};

const loyaltyColors: Record<ClientProfileDetail['loyaltyTier'], string> = {
  elite: 'from-[#2ECC71] via-[#27AE60] to-[#1A7743]',
  prime: 'from-[#56CCF2] via-[#2F80ED] to-[#1C4EAD]',
  core: 'from-[#F2994A] via-[#F2C94C] to-[#C86B10]',
};

export function ClientProfileView({ client, onBack }: ClientProfileViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux clients
        </Button>
        <Badge variant="outline" className="rounded-full text-xs">
          Compte #{client.id}
        </Badge>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-3xl text-white p-8',
          'bg-gradient-to-br',
          loyaltyColors[client.loyaltyTier],
        )}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="size-28 border-4 border-white/30">
              <AvatarImage src={client.avatarUrl} alt={client.fullName} />
              <AvatarFallback className="text-lg">
                {client.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <p className="text-white/70 text-sm uppercase">
                  {client.segment.toUpperCase()} · {client.loyaltyTier.toUpperCase()}
                </p>
                {client.verified && (
                  <Badge className="bg-white/20 text-white rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-semibold">{client.fullName}</h1>
              <p className="text-white/80 flex items-center gap-2 text-sm">
                <span>{client.username}</span>
                <span className="text-white/40">•</span>
                <span>{client.city}</span>
                <span className="text-white/40">•</span>
                <span>Membre depuis {client.joinedAt}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-white/90 rounded-xl border-none">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacter le client
            </Button>
            <Button variant="outline" className="bg-white/10 border-white/40 text-white rounded-xl hover:bg-white/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Proposer une offre
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <HeroStat label="Visites réservées" value={client.stats.visits.toString()} />
          <HeroStat label="Baux signés" value={client.stats.leases.toString()} />
          <HeroStat label="Satisfaction" value={`${client.stats.satisfaction.toFixed(1)}/5`} />
          <HeroStat label="Dépenses cumulées" value={`${client.stats.spend.toLocaleString('fr-FR')} FCFA`} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Statistiques comportementales" description="Inspiré de la vue mobile PUOL" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <EngagementStat
                  icon={<Calendar className="w-4 h-4" />}
                  label="Séjours"
                  value={`${client.stats.reservations} réservations`}
                  accent="from-[#E8FFF5] to-[#C1FFD9]"
                  valueClass="text-emerald-700"
                />
                <EngagementStat
                  icon={<Clock4 className="w-4 h-4" />}
                  label="Nuits totales"
                  value={`${client.stats.nights} nuits`}
                  accent="from-[#FFF5E8] to-[#FFE4C9]"
                  valueClass="text-amber-700"
                />
                <EngagementStat
                  icon={<Heart className="w-4 h-4" />}
                  label="Engagement social"
                  value={`${client.stats.likes} likes · ${client.stats.comments} commentaires`}
                  accent="from-[#FFE8F2] to-[#FFCDE2]"
                  valueClass="text-rose-700"
                />
                <EngagementStat
                  icon={<Users className="w-4 h-4" />}
                  label="Followers"
                  value={`${client.stats.followers} connexions`}
                  accent="from-[#E8F4FF] to-[#D4E7FF]"
                  valueClass="text-sky-700"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Visites planifiées" description="Roadmap immersive & présentielle" />
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60">
                    <TableHead>Bien</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Créneau</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.visitsHistory.map((visit) => (
                    <TableRow key={visit.id}>
                      <TableCell className="font-semibold text-gray-900">{visit.property}</TableCell>
                      <TableCell>{visit.city}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700">
                          {visit.date}
                          <span className="text-gray-400"> · </span>
                          {visit.hour}
                        </div>
                        <p className="text-xs text-gray-500">{visit.notes}</p>
                      </TableCell>
                      <TableCell>{visit.agent}</TableCell>
                      <TableCell className={cn('text-sm font-semibold', visitStatuses[visit.status])}>
                        {visit.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Historique des baux" description="Contrats signés via PUOL" />
              {client.leasesHistory.length === 0 ? (
                <EmptyState message="Aucun bail signé pour le moment." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {client.leasesHistory.map((lease) => (
                    <div key={lease.id} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">{lease.property}</span>
                        <Badge className={cn('rounded-full text-xs capitalize', statusChips[lease.status])}>
                          {lease.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Propriétaire : {lease.landlord}</p>
                        <p>
                          {lease.startDate} – {lease.endDate ?? 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-base font-semibold text-gray-900">{lease.value}</p>
                        <Button variant="outline" size="sm" className="rounded-full">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Voir le bail
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Timeline client" description="Interactions clefs" />
              <div className="space-y-4">
                {client.timeline.map((event) => {
                  const colors = timelineColors[event.type];
                  return (
                    <div key={event.id} className={cn('rounded-2xl p-4 flex items-start gap-4', colors.bg)}>
                      <div className={cn('w-2.5 h-10 rounded-full', colors.dot)} />
                      <div>
                        <p className="text-xs uppercase text-gray-500">{event.date}</p>
                        <p className={cn('text-sm font-semibold', colors.accent)}>{event.label}</p>
                        <p className="text-sm text-gray-600">{event.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Coordonnées & statut" description="Infos opérationnelles à jour" />
              <div className="space-y-3">
                <ContactLine icon={<Phone className="w-4 h-4" />} value={client.phone} />
                <ContactLine icon={<MapPin className="w-4 h-4" />} value={client.city} />
                <ContactLine icon={<Star className="w-4 h-4" />} value={`Indice confiance : ${client.satisfaction.toFixed(1)}`} />
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                {client.preferences.map((pref) => (
                  <Badge key={pref} className="rounded-full bg-emerald-50 text-emerald-700">
                    {pref}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {client.lifestyleTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="rounded-full text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Actions rapides" description="Inspirées du dashboard mobile" />
              <QuickAction icon={<Wallet className="w-4 h-4" />} label="Envoyer un lien de paiement" detail="Acompte ou solde." />
              <QuickAction icon={<Pin className="w-4 h-4" />} label="Proposer un nouveau bien" detail="Match selon préférences." />
              <QuickAction icon={<TrendingUp className="w-4 h-4" />} label="Activer offre fidélité" detail="% cashback sur prochain séjour." />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="rounded-xl flex-1">
                  Ajouter une note
                </Button>
                <Button className="rounded-xl flex-1 bg-[#2ECC71] hover:bg-[#27AE60]">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marquer comme prioritaire
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <SectionHeader title="Notes internes" description="Visible uniquement par PUOL" />
              <p className="text-sm text-gray-600">{client.notes}</p>
              <Button variant="ghost" size="sm" className="self-start px-0 text-[#2ECC71]">
                Ajouter un commentaire
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <SectionHeader title="Villes favorites" description="Basé sur l’activité mobile" />
              <div className="flex flex-wrap gap-2">
                {client.stats.favoriteCities === 0 ? (
                  <EmptyState message="Aucune ville favorite détectée." small />
                ) : (
                  ['Douala', 'Yaoundé', 'Kribi', 'Limbe']
                    .slice(0, client.stats.favoriteCities)
                    .map((city) => (
                      <Badge key={city} variant="secondary" className="rounded-full px-4 py-1 text-sm">
                        {city}
                      </Badge>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 border border-white/20 backdrop-blur">
      <p className="text-xs uppercase text-white/60">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function EngagementStat({
  icon,
  label,
  value,
  accent,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  valueClass: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-white/60 bg-gradient-to-br p-4 flex gap-3 items-center shadow-sm', accent)}>
      <div className="w-10 h-10 rounded-xl bg-white text-gray-900 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs uppercase text-gray-500">{label}</p>
        <p className={cn('text-base font-semibold leading-tight', valueClass)}>{value}</p>
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

function ContactLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-700">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">{icon}</div>
      <span>{value}</span>
    </div>
  );
}

function QuickAction({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-3 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function EmptyState({ message, small = false }: { message: string; small?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-gray-200 text-center text-gray-500',
        small ? 'px-3 py-2 text-sm' : 'px-6 py-8 text-sm',
      )}
    >
      {message}
    </div>
  );
}
