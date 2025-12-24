import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  hostListings,
  hostReservations,
  hostVisits,
  hostSubtabs,
  hostProfileDetails,
  hostListingDetails,
  hostRequests,
} from '../UsersManagement';
import type { ListingFilters, HostProfileDetail } from '../UsersManagement';
import { VisitsBoard } from '../VisitsManagement';
import { HostReservationsBoard } from './shared/HostReservationsBoard';
import { HostPartnersBoard } from './shared/HostPartnersBoard';
import { ListingsBoard } from './shared/ListingsBoard';
import { HostProfileView } from './shared/HostProfileView';
import { HostListingDetailView } from './shared/HostListingDetailView';
import { HostMessagesBoard } from './shared/HostMessagesBoard';
import { HostRequestsBoard } from './shared/HostRequestsBoard';

export function HostsSection() {
  const [activeSubtab, setActiveSubtab] = useState(hostSubtabs[0]?.id ?? 'annonces');
  const [listingFilters, setListingFilters] = useState<ListingFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSubtab !== 'hosts' && selectedHostId) {
      setSelectedHostId(null);
    }
    if (activeSubtab !== 'annonces' && selectedListingId) {
      setSelectedListingId(null);
    }
  }, [activeSubtab, selectedHostId, selectedListingId]);

  const stats = useMemo(
    () => [
      { label: 'Hôtes actifs', value: '152' },
      { label: 'Annonces hôtes', value: hostListings.length },
      { label: 'Réservations', value: hostReservations.length },
      { label: 'Visites', value: hostVisits.length },
    ],
    [],
  );

  const renderSubtab = (tab: string) => {
    switch (tab) {
      case 'annonces': {
        if (selectedListingId) {
          const detail = hostListingDetails[selectedListingId];
          if (detail) {
            return (
              <HostListingDetailView
                listing={detail}
                onBack={() => setSelectedListingId(null)}
                onViewHostProfile={setSelectedHostId}
              />
            );
          }
        }
        return (
          <ListingsBoard
            listings={hostListings}
            filters={listingFilters}
            onFilterChange={(patch) =>
              setListingFilters((prev) => ({ ...prev, ...patch }))
            }
            title="Annonces Hôtes"
            description="Monitoring des annonces côté hôtes et opérations"
            ownerLabel="Hôte"
            onViewListing={setSelectedListingId}
          />
        );
      }
      case 'hosts': {
        if (selectedHostId) {
          const detail: HostProfileDetail | undefined = hostProfileDetails[selectedHostId];
          if (detail) {
            return <HostProfileView host={detail} onBack={() => setSelectedHostId(null)} />;
          }
        }
        return <HostPartnersBoard onViewProfile={setSelectedHostId} />;
      }
      case 'reservations':
        return <HostReservationsBoard />;
      case 'demandes':
        return <HostRequestsBoard requests={hostRequests} />;
      case 'visits':
        return (
          <VisitsBoard
            visits={hostVisits}
            feeLabel="Frais hôtes"
            feeAmount="5 000 FCFA"
            searchPlaceholder="Rechercher par propriété, client, ville..."
          />
        );
      case 'messages':
        return <HostMessagesBoard />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Hôtes</h1>
        <p className="text-gray-500 mt-1">
          Pilotage des hôtes, de leurs annonces et des workflows associés
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeSubtab} onValueChange={setActiveSubtab}>
        <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap">
          {hostSubtabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-lg data-[state=active]:bg-white flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {hostSubtabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 space-y-4">
            {tab.id !== 'hosts' && (
              <div>
                <p className="text-lg font-semibold text-gray-900">{tab.label}</p>
                <p className="text-sm text-gray-500">{tab.description}</p>
              </div>
            )}
            {renderSubtab(tab.id)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
