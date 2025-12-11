export type LandlordTenant = {
  id: string;
  hostId: string;
  tenantName: string;
  tenantUsername?: string | null;
  tenantAvatar?: string | null;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  propertyTitle: string;
  propertyAddress: string;
  propertyImage?: string | null;
  leaseStart: string;
  leaseEnd: string | null;
  leaseMonths: number;
  monthlyRent: number;
  depositAmount: number | null;
  notes?: string | null;
};

const createTenant = (tenant: LandlordTenant): LandlordTenant => tenant;

export const MOCK_LANDLORD_TENANTS: LandlordTenant[] = [
  createTenant({
    id: 'tenant-0001',
    hostId: 'landlord-demo',
    tenantName: 'Mireille Tchamda',
    tenantUsername: '@mimi.tch',
    tenantAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=320&q=80',
    tenantPhone: '+237 690 12 34 56',
    tenantEmail: 'mireille.tchamda@example.com',
    propertyTitle: 'Appartement cosy Bonapriso',
    propertyAddress: 'Rue Joss, Douala',
    propertyImage: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
    leaseStart: '2025-01-15',
    leaseEnd: '2025-07-14',
    leaseMonths: 6,
    monthlyRent: 320000,
    depositAmount: 640000,
    notes: 'Client corporate, souhaite un nettoyage mensuel organisé par PUOL.',
  }),
  createTenant({
    id: 'tenant-0002',
    hostId: 'landlord-demo',
    tenantName: 'Gédéon Mbah',
    tenantUsername: '@gedeon.m',
    tenantAvatar: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=320&q=80',
    tenantPhone: '+237 677 45 89 21',
    tenantEmail: 'gedeon.mbah@example.com',
    propertyTitle: 'Studio moderne Bastos',
    propertyAddress: 'Impasse des ambassades, Yaoundé',
    propertyImage: 'https://images.unsplash.com/photo-1613977256644-1ecc70409f41?auto=format&fit=crop&w=800&q=80',
    leaseStart: '2024-08-01',
    leaseEnd: null,
    leaseMonths: 12,
    monthlyRent: 250000,
    depositAmount: 250000,
    notes: 'Paiement par virement automatique, souhaite recevoir les quittances par mail.',
  }),
  createTenant({
    id: 'tenant-0003',
    hostId: 'landlord-demo',
    tenantName: 'Sylvie Moukouri',
    tenantUsername: '@sylvie.mk',
    tenantAvatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80',
    tenantPhone: '+237 699 11 22 33',
    tenantEmail: 'sylvie.moukouri@example.com',
    propertyTitle: 'Duplex vue Jardin Bonamoussadi',
    propertyAddress: 'Carrefour Yassa, Douala',
    propertyImage: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80',
    leaseStart: '2023-05-10',
    leaseEnd: '2024-05-09',
    leaseMonths: 12,
    monthlyRent: 450000,
    depositAmount: 450000,
    notes: 'Locataire très ponctuelle, bail renouvelé une fois par le passé.',
  }),
];
