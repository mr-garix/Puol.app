import type { ReactNode } from 'react';
import type { HostProfileDetail, HostTimelineEvent, HostReservationSummary } from '../../UsersManagement';
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
  MessageSquare,
  TrendingUp,
  Users,
  Eye,
  Pencil,
  CheckCircle2,
  Mail,
  Heart,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';

type HostProfileViewProps = {
  host: HostProfileDetail;
  onBack: () => void;
};

const timelineColors: Record<
  HostTimelineEvent['type'],
  { bg: string; dot: string; accent: string }
> = {
  reservation: { bg: 'bg-blue-50', dot: 'bg-blue-500', accent: 'text-blue-800' },
  payout: { bg: 'bg-emerald-50', dot: 'bg-emerald-500', accent: 'text-emerald-800' },
  quality: { bg: 'bg-purple-50', dot: 'bg-purple-500', accent: 'text-purple-800' },
};

export function HostProfileView({ host, onBack }: HostProfileViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour aux hôtes
        </Button>
        <Badge variant="outline" className="rounded-full text-xs">
          Compte #{host.id}
        </Badge>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2ECC71] via-[#27AE60] to-[#1A7743] text-white p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="size-28 border-4 border-white/30">
              <AvatarImage src={host.avatarUrl} alt={host.name} />
              <AvatarFallback className="text-lg">{host.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white/70 text-sm uppercase">{host.segment.toUpperCase()}</p>
              <h1 className="text-3xl font-semibold">{host.name}</h1>
              <p className="text-white/80">
                {host.username} · {host.city}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="bg-white text-[#27AE60] hover:bg-white/90 rounded-xl border-none">
              <MessageSquare className="w-4 h-4 mr-2" />
              Contacter l’hôte
            </Button>
            <Button variant="destructive" className="rounded-xl">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mettre sous revue
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <HeroStat label="Voyageurs accompagnés" value={host.stats.guests.toString()} />
          <HeroStat label="Nuits opérées" value={host.stats.nights.toString()} />
          <HeroStat label="Note moyenne" value={host.stats.rating.toFixed(2)} />
          <HeroStat label="Revenus bruts" value={host.stats.payout} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader
                title="Statistiques d’engagement"
                description="Visibilité des annonces et perception voyageurs"
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <EngagementStat
                  icon={<Eye className="w-4 h-4" />}
                  label="Vues totales"
                  value={host.engagement.views.toLocaleString('fr-FR')}
                  accent="from-[#E8FFF5] to-[#C1FFD9]"
                  valueClass="text-emerald-700"
                />
                <EngagementStat
                  icon={<Heart className="w-4 h-4" />}
                  label="Likes"
                  value={host.engagement.likes.toLocaleString('fr-FR')}
                  accent="from-[#FFE8F1] to-[#FFC7DA]"
                  valueClass="text-rose-700"
                />
                <EngagementStat
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Commentaires"
                  value={host.engagement.comments.toLocaleString('fr-FR')}
                  accent="from-[#E8F4FF] to-[#C8E2FF]"
                  valueClass="text-sky-700"
                />
                <EngagementStat
                  icon={<Star className="w-4 h-4" />}
                  label="Satisfaction"
                  value={`${host.satisfactionScore.toFixed(1)}/5`}
                  accent="from-[#FFF5E8] to-[#FFE1BF]"
                  valueClass="text-amber-700"
                  hint="Avis voyageurs"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Réservations récentes" description="Flux à surveiller" />
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/60">
                    <TableHead>Référence</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {host.reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-semibold text-gray-900">{reservation.id}</TableCell>
                      <TableCell>{reservation.guest}</TableCell>
                      <TableCell>{reservation.stay}</TableCell>
                      <TableCell>{reservation.amount}</TableCell>
                      <TableCell>
                        <Badge className={statusStyles(reservation.status)}>
                          {reservation.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Top annonces" description="Performances & recettes" />
              <div className="grid gap-4 md:grid-cols-2">
                {host.listings.map((listing) => (
                  <div key={listing.id} className="rounded-2xl border border-gray-100 p-4 space-y-3">
                    <div className="flex gap-3">
                      <div
                        className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0"
                        style={{
                          backgroundImage: `url(${listing.coverUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-gray-500">{listing.id}</p>
                        <p className="text-base font-semibold text-gray-900">{listing.title}</p>
                        <p className="text-sm text-gray-500">
                          {listing.city} · {listing.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-emerald-500" />
                        {listing.occupancy}% taux occupation
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-500" />
                        {listing.rating.toFixed(2)}
                      </span>
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
                    <p className="text-sm font-semibold text-gray-900">{listing.revenue}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Timeline opérations" description="Payouts, qualité, réservations" />
              <div className="space-y-4">
                {host.timeline.map((event) => {
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
              <SectionHeader title="Contact & statut" description="Coordonnées hôte validées" />
              <div className="space-y-3">
                <ContactLine icon={<Mail className="w-4 h-4" />} value={host.email} />
                <ContactLine icon={<Phone className="w-4 h-4" />} value={host.phone} />
                <ContactLine icon={<MapPin className="w-4 h-4" />} value={host.address} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {host.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-4">
                <Button variant="outline" className="rounded-xl flex-1">
                  Envoyer un message
                </Button>
                <Button variant="outline" className="rounded-xl flex-1">
                  Ajouter une note
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-4">
              <SectionHeader title="Suivi opérationnel" description="Actions rapides" />
              <QuickAction label="Activer check-in PUOL" detail="Automatise les arrivées avec codes uniques." />
              <QuickAction label="Déployer shooting" detail="Planifie photos + visite virtuelle." />
              <QuickAction label="Optimiser pricing" detail="Applique tarif suggéré smart revenue." />
              <Button className="w-full rounded-xl bg-[#2ECC71] hover:bg-[#27AE60]">
                <TrendingUp className="w-4 h-4 mr-2" />
                Proposer un upgrade
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-gray-100">
            <CardContent className="p-6 space-y-3">
              <SectionHeader title="Notes internes" description="Visible uniquement par PUOL" />
              <p className="text-sm text-gray-600">{host.notes}</p>
              <Button variant="ghost" size="sm" className="self-start px-0 text-[#2ECC71]">
                Ajouter un commentaire
              </Button>
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
      <p className="text-xs uppercase text-white/70">{label}</p>
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
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent: string;
  valueClass: string;
  hint?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/60 bg-gradient-to-br p-4 flex items-center gap-3 shadow-sm',
        accent,
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-white text-gray-900 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs uppercase text-gray-600">{label}</p>
        <p className={cn('text-2xl font-semibold', valueClass)}>{value}</p>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
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
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{icon}</div>
      <span>{value}</span>
    </div>
  );
}

function QuickAction({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-3">
      <p className="text-sm font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function statusStyles(status: HostReservationSummary['status']) {
  const styles: Record<HostReservationSummary['status'], string> = {
    'à confirmer': 'bg-amber-100 text-amber-700',
    confirmée: 'bg-emerald-100 text-emerald-700',
    'en litige': 'bg-rose-100 text-rose-700',
  };
  return cn('text-xs rounded-full px-3 py-1 capitalize', styles[status]);
}
