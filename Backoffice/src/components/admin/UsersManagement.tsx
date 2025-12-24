import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  Clock,
  FileCheck,
  Filter,
  Eye,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  CheckCircle,
  XCircle,
  Shield,
  Users,
  Search,
} from 'lucide-react';
import { VisitsBoard, type VisitRecord } from './VisitsManagement';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/ui/utils';

type RoleKey = 'landlord' | 'host' | 'client';

const roleTabs: Record<RoleKey, { label: string; description: string; accent: string; icon: typeof Users }> = {
  landlord: { label: 'Bailleurs', description: 'Bailleurs officiant via Esppo', accent: 'text-emerald-600', icon: Shield },
  host: { label: 'Hôtes', description: 'Gestionnaires d’annonces et d’opérations', accent: 'text-blue-600', icon: Home },
  client: { label: 'Clients', description: 'Locataires / acheteurs', accent: 'text-purple-600', icon: Users },
};

export type HostRequestStatus = LandlordRequestStatus;

export type HostRequest = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  experienceYears: number;
  listingsHosted: number;
  submittedAt: string;
  motivation: string;
  documents: string[];
  avatarUrl: string;
  status: HostRequestStatus;
};

export const hostRequests: HostRequest[] = [
  {
    id: 'HOST-REQ-301',
    fullName: 'Linda K.',
    firstName: 'Linda',
    lastName: 'K.',
    phone: '+237 699 11 22 33',
    city: 'Kribi',
    experienceYears: 5,
    listingsHosted: 4,
    submittedAt: '18 déc 2025',
    motivation: 'Étendre le parc PUOL+ sur Kribi avec deux lofts premium et bénéficier du support opérations.',
    documents: ['CNI', 'Contrat PUOL+', 'Plan hygiène'],
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
    status: 'pending',
  },
  {
    id: 'HOST-REQ-302',
    fullName: 'Pierre T.',
    firstName: 'Pierre',
    lastName: 'T.',
    phone: '+237 677 44 55 66',
    city: 'Yaoundé',
    experienceYears: 3,
    listingsHosted: 3,
    submittedAt: '16 déc 2025',
    motivation: 'Souhaite basculer trois appartements Bastos vers une gestion 100% PUOL avec visites virtuelles.',
    documents: ['CNI', 'Justif. fiscal'],
    avatarUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=facearea&w=200&h=200',
    status: 'pending',
  },
  {
    id: 'HOST-REQ-303',
    fullName: 'Nadia S.',
    firstName: 'Nadia',
    lastName: 'S.',
    phone: '+237 690 77 33 55',
    city: 'Douala',
    experienceYears: 1,
    listingsHosted: 1,
    submittedAt: '12 déc 2025',
    motivation: 'Lancer une première villa opérée par PUOL et obtenir la certification PUOL+ dès janvier.',
    documents: ['CNI', 'Titre foncier'],
    avatarUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=facearea&w=200&h=200',
    status: 'approved',
  },
];

export type ClientProfileRecord = {
  id: string;
  fullName: string;
  username: string;
  segment: 'premium' | 'core' | 'lite';
  city: string;
  phone: string;
  reservations: number;
  nights: number;
  spend: number;
  satisfaction: number;
  lastStay: string;
  status: 'actif' | 'à risque' | 'suspendu';
  visitsBooked: number;
  leasesSigned: number;
  avatarUrl: string;
};

export const clientProfiles: ClientProfileRecord[] = [
  {
    id: 'CL-201',
    fullName: 'Sarah Nkomo',
    username: '@sarah_nk',
    segment: 'premium',
    city: 'Douala',
    phone: '+237 699 88 45 11',
    reservations: 9,
    nights: 42,
    spend: 2850000,
    satisfaction: 4.9,
    lastStay: '12 déc 2025',
    status: 'actif',
    visitsBooked: 6,
    leasesSigned: 2,
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
  },
  {
    id: 'CL-202',
    fullName: 'Ibrahim Akoa',
    username: '@ibraakoa',
    segment: 'core',
    city: 'Yaoundé',
    phone: '+237 677 21 90 54',
    reservations: 6,
    nights: 24,
    spend: 1380000,
    satisfaction: 4.5,
    lastStay: '05 déc 2025',
    status: 'actif',
    visitsBooked: 4,
    leasesSigned: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&w=200&h=200',
  },
  {
    id: 'CL-203',
    fullName: 'Liliane Fotso',
    username: '@lili_fotso',
    segment: 'premium',
    city: 'Kribi',
    phone: '+237 690 11 22 33',
    reservations: 4,
    nights: 18,
    spend: 980000,
    satisfaction: 4.8,
    lastStay: '28 nov 2025',
    status: 'à risque',
    visitsBooked: 5,
    leasesSigned: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=facearea&w=200&h=200',
  },
  {
    id: 'CL-204',
    fullName: 'Ghislain Talla',
    username: '@ghis_talla',
    segment: 'core',
    city: 'Bafoussam',
    phone: '+237 652 77 31 40',
    reservations: 3,
    nights: 12,
    spend: 460000,
    satisfaction: 4.2,
    lastStay: '22 nov 2025',
    status: 'actif',
    visitsBooked: 2,
    leasesSigned: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=facearea&w=200&h=200',
  },
  {
    id: 'CL-205',
    fullName: 'Mireille Tchoumi',
    username: '@mimi_tc',
    segment: 'lite',
    city: 'Douala',
    phone: '+237 651 00 44 89',
    reservations: 2,
    nights: 7,
    spend: 210000,
    satisfaction: 3.9,
    lastStay: '14 nov 2025',
    status: 'suspendu',
    visitsBooked: 1,
    leasesSigned: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=200&h=200',
  },
  {
    id: 'CL-206',
    fullName: 'Valery Tchouassi',
    username: '@valery_tc',
    segment: 'core',
    city: 'Limbe',
    phone: '+237 699 12 77 33',
    reservations: 5,
    nights: 20,
    spend: 760000,
    satisfaction: 4.6,
    lastStay: '02 nov 2025',
    status: 'actif',
    visitsBooked: 3,
    leasesSigned: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?auto=format&fit=facearea&w=200&h=200',
  },
];

export type ClientVisitStatus = 'confirmée' | 'en attente' | 'terminée';
export type ClientLeaseStatus = 'signé' | 'en cours' | 'clos';
export type ClientTimelineEventType = 'reservation' | 'visit' | 'payment' | 'support';

export type ClientVisitRecord = {
  id: string;
  property: string;
  city: string;
  date: string;
  hour: string;
  status: ClientVisitStatus;
  agent: string;
  notes: string;
};

export type ClientLeaseRecord = {
  id: string;
  property: string;
  landlord: string;
  startDate: string;
  endDate: string;
  value: string;
  status: ClientLeaseStatus;
};

export type ClientTimelineEvent = {
  id: string;
  date: string;
  type: ClientTimelineEventType;
  label: string;
  detail: string;
};

export type ClientProfileDetail = ClientProfileRecord & {
  joinedAt: string;
  verified: boolean;
  loyaltyTier: 'elite' | 'prime' | 'core';
  preferences: string[];
  lifestyleTags: string[];
  notes: string;
  stats: {
    reservations: number;
    nights: number;
    spend: number;
    visits: number;
    leases: number;
    satisfaction: number;
    comments: number;
    likes: number;
    followers: number;
    favoriteCities: number;
  };
  visitsHistory: ClientVisitRecord[];
  leasesHistory: ClientLeaseRecord[];
  timeline: ClientTimelineEvent[];
};

export const clientProfileDetails: Record<string, ClientProfileDetail> = {
  'CL-201': {
    ...clientProfiles[0],
    joinedAt: '2019',
    verified: true,
    loyaltyTier: 'elite',
    preferences: ['Visites virtuelles', 'Conciergerie premium', 'Locations > 1 mois'],
    lifestyleTags: ['Nomade digital', 'Corporate', 'PUOL+'],
    notes: 'Prépare un déménagement sur Kribi pour Q1 2026, apprécie les visites immersives disponibles sous 24h.',
    stats: {
      reservations: 9,
      nights: 42,
      spend: 2_850_000,
      visits: 6,
      leases: 2,
      satisfaction: 4.9,
      comments: 18,
      likes: 32,
      followers: 210,
      favoriteCities: 3,
    },
    visitsHistory: [
      {
        id: 'CL201-V1',
        property: 'Villa Kribi Signature',
        city: 'Kribi',
        date: '18 déc 2025',
        hour: '10:00',
        status: 'confirmée',
        agent: 'Kelly',
        notes: 'Souhaite tester la fibre avant validation.',
      },
      {
        id: 'CL201-V2',
        property: 'Loft Bonapriso Horizon',
        city: 'Douala',
        date: '06 déc 2025',
        hour: '15:30',
        status: 'terminée',
        agent: 'Jason',
        notes: 'Feedback très positif, demande d’offre corporate.',
      },
      {
        id: 'CL201-V3',
        property: 'Résidence Marina PUOL',
        city: 'Kribi',
        date: '28 nov 2025',
        hour: '11:00',
        status: 'terminée',
        agent: 'Kelly',
        notes: 'Veut pack ménage hebdo inclus.',
      },
    ],
    leasesHistory: [
      {
        id: 'CL201-L1',
        property: 'Loft Kribi Vue Mer',
        landlord: 'Linda K.',
        startDate: '15 jan 2025',
        endDate: '15 avr 2025',
        value: '1,8 M FCFA',
        status: 'clos',
      },
      {
        id: 'CL201-L2',
        property: 'Penthouse Bonapriso',
        landlord: 'Pierre T.',
        startDate: '03 mai 2024',
        endDate: '03 oct 2024',
        value: '3,2 M FCFA',
        status: 'clos',
      },
    ],
    timeline: [
      {
        id: 'CL201-T1',
        date: '19 déc',
        type: 'support',
        label: 'Ticket résolu',
        detail: 'Accès visite immersive Kribi restauré en 18 min.',
      },
      {
        id: 'CL201-T2',
        date: '12 déc',
        type: 'reservation',
        label: 'Séjour confirmé',
        detail: 'Villa Kribi Signature du 05 au 20 jan.',
      },
      {
        id: 'CL201-T3',
        date: '05 déc',
        type: 'payment',
        label: 'Acompte validé',
        detail: 'Transfert 600 000 FCFA via mobile money.',
      },
      {
        id: 'CL201-T4',
        date: '28 nov',
        type: 'visit',
        label: 'Visite guidée',
        detail: 'Résidence Marina avec concierge Kelly.',
      },
    ],
  },
  'CL-202': {
    ...clientProfiles[1],
    joinedAt: '2021',
    verified: true,
    loyaltyTier: 'prime',
    preferences: ['Studios business', 'Accès auto check-in', 'Proximité transport'],
    lifestyleTags: ['Consultant IT', 'City Break'],
    notes: 'Recherche systématiquement des options avec générateur et assistance ménage.',
    stats: {
      reservations: 6,
      nights: 24,
      spend: 1_380_000,
      visits: 4,
      leases: 1,
      satisfaction: 4.5,
      comments: 9,
      likes: 15,
      followers: 92,
      favoriteCities: 2,
    },
    visitsHistory: [
      {
        id: 'CL202-V1',
        property: 'Colocation Akwa',
        city: 'Douala',
        date: '21 déc 2025',
        hour: '09:30',
        status: 'confirmée',
        agent: 'Marion',
        notes: 'Souhaite vérifier salle de réunion.',
      },
      {
        id: 'CL202-V2',
        property: 'Studio Bastos Pro',
        city: 'Yaoundé',
        date: '10 déc 2025',
        hour: '18:00',
        status: 'terminée',
        agent: 'Armel',
        notes: 'A demandé ajout écran 32".',
      },
      {
        id: 'CL202-V3',
        property: 'Résidence Plateau',
        city: 'Yaoundé',
        date: '24 nov 2025',
        hour: '14:00',
        status: 'en attente',
        agent: 'Armel',
        notes: 'Planification à confirmer selon vol retour.',
      },
    ],
    leasesHistory: [
      {
        id: 'CL202-L1',
        property: 'Studio Bastos Pro',
        landlord: 'Pierre T.',
        startDate: '10 jan 2025',
        endDate: '10 mar 2025',
        value: '900 000 FCFA',
        status: 'clos',
      },
    ],
    timeline: [
      {
        id: 'CL202-T1',
        date: '20 déc',
        type: 'support',
        label: 'Ticket facturation',
        detail: 'Confirmation acompte Colocation Akwa envoyée.',
      },
      {
        id: 'CL202-T2',
        date: '12 déc',
        type: 'reservation',
        label: 'Séjour confirmé',
        detail: 'Duplex Bonamoussadi du 05 au 09 jan.',
      },
      {
        id: 'CL202-T3',
        date: '06 déc',
        type: 'visit',
        label: 'Visite Studio Bastos',
        detail: 'Essai domotique avec agent Armel.',
      },
    ],
  },
  'CL-203': {
    ...clientProfiles[2],
    joinedAt: '2020',
    verified: false,
    loyaltyTier: 'prime',
    preferences: ['Biens proches mer', 'Décoration contemporaine', 'Services photo'],
    lifestyleTags: ['Créatrice contenu', 'Voyages weekend'],
    notes: 'Profil à surveiller : statut “à risque” suite à deux annulations tardives en 2024.',
    stats: {
      reservations: 4,
      nights: 18,
      spend: 980_000,
      visits: 5,
      leases: 1,
      satisfaction: 4.8,
      comments: 14,
      likes: 41,
      followers: 420,
      favoriteCities: 2,
    },
    visitsHistory: [
      {
        id: 'CL203-V1',
        property: 'Maison dôme Kribi',
        city: 'Kribi',
        date: '17 déc 2025',
        hour: '16:00',
        status: 'terminée',
        agent: 'Kelly',
        notes: 'Veut shooting photo sur rooftop.',
      },
      {
        id: 'CL203-V2',
        property: 'Duplex Bali',
        city: 'Douala',
        date: '05 déc 2025',
        hour: '13:30',
        status: 'confirmée',
        agent: 'Jason',
        notes: 'Demande info sur lumière naturelle.',
      },
      {
        id: 'CL203-V3',
        property: 'Suite lagon PUOL',
        city: 'Kribi',
        date: '26 nov 2025',
        hour: '11:30',
        status: 'terminée',
        agent: 'Kelly',
        notes: 'A demandé inclusion créateur contenu local.',
      },
    ],
    leasesHistory: [
      {
        id: 'CL203-L1',
        property: 'Suite Lagune Kribi',
        landlord: 'Nadia S.',
        startDate: '01 août 2024',
        endDate: '01 sept 2024',
        value: '620 000 FCFA',
        status: 'clos',
      },
    ],
    timeline: [
      {
        id: 'CL203-T1',
        date: '18 déc',
        type: 'support',
        label: 'Ticket vérification',
        detail: 'Confirmation identité relancée, en attente documents.',
      },
      {
        id: 'CL203-T2',
        date: '10 déc',
        type: 'visit',
        label: 'Visite Duplex Bali',
        detail: 'Note 5/5, veut option décoratrice.',
      },
      {
        id: 'CL203-T3',
        date: '30 nov',
        type: 'reservation',
        label: 'Séjour pending',
        detail: 'Maison dôme Kribi (besoin acompte).',
      },
    ],
  },
  'CL-204': {
    ...clientProfiles[3],
    joinedAt: '2022',
    verified: true,
    loyaltyTier: 'core',
    preferences: ['Studios coliving', 'Paiement mensuel', 'Visites week-end'],
    lifestyleTags: ['Jeune actif', 'Tech'],
    notes: 'Intérêt pour offres coliving avec espaces gaming.',
    stats: {
      reservations: 3,
      nights: 12,
      spend: 460_000,
      visits: 2,
      leases: 0,
      satisfaction: 4.2,
      comments: 4,
      likes: 9,
      followers: 34,
      favoriteCities: 1,
    },
    visitsHistory: [
      {
        id: 'CL204-V1',
        property: 'Colocation Akwa',
        city: 'Douala',
        date: '12 déc 2025',
        hour: '18:30',
        status: 'terminée',
        agent: 'Marion',
        notes: 'A demandé espace bureau partagé.',
      },
      {
        id: 'CL204-V2',
        property: 'Studio Makepe Nova',
        city: 'Douala',
        date: '03 déc 2025',
        hour: '08:00',
        status: 'confirmée',
        agent: 'Marion',
        notes: 'Veut tester matelas avant décision.',
      },
    ],
    leasesHistory: [],
    timeline: [
      {
        id: 'CL204-T1',
        date: '15 déc',
        type: 'payment',
        label: 'Acompte en attente',
        detail: 'Studio Makepe Nova (paiement partiel reçu).',
      },
      {
        id: 'CL204-T2',
        date: '07 déc',
        type: 'visit',
        label: 'Visite Colocation Akwa',
        detail: 'Préférence chambre 3 côté cour.',
      },
      {
        id: 'CL204-T3',
        date: '01 déc',
        type: 'support',
        label: 'Demande assistance',
        detail: 'Souhaite facture pro format.',
      },
    ],
  },
  'CL-205': {
    ...clientProfiles[4],
    joinedAt: '2020',
    verified: false,
    loyaltyTier: 'core',
    preferences: ['Mini studios', 'Budget serré', 'Paiement mobile money'],
    lifestyleTags: ['Solo travel', 'Artisanat'],
    notes: 'Compte suspendu – vérifier conformité pièces identité.',
    stats: {
      reservations: 2,
      nights: 7,
      spend: 210_000,
      visits: 1,
      leases: 0,
      satisfaction: 3.9,
      comments: 2,
      likes: 6,
      followers: 15,
      favoriteCities: 1,
    },
    visitsHistory: [
      {
        id: 'CL205-V1',
        property: 'Mini studio Bonamoussadi',
        city: 'Douala',
        date: '14 nov 2025',
        hour: '17:00',
        status: 'terminée',
        agent: 'Sophie',
        notes: 'A demandé remise -10% longue durée.',
      },
    ],
    leasesHistory: [],
    timeline: [
      {
        id: 'CL205-T1',
        date: '16 nov',
        type: 'support',
        label: 'Suspension',
        detail: 'En attente revalidation identité (CNI expirée).',
      },
      {
        id: 'CL205-T2',
        date: '12 nov',
        type: 'payment',
        label: 'Remboursement partiel',
        detail: 'Séjour annulé par client (Mini studio).',
      },
    ],
  },
  'CL-206': {
    ...clientProfiles[5],
    joinedAt: '2023',
    verified: true,
    loyaltyTier: 'prime',
    preferences: ['Maisons familiales', 'Piscine', 'Séjours week-end'],
    lifestyleTags: ['Chef d’entreprise', 'Family trips'],
    notes: 'Prépare une tournée commerciale à Limbe avec équipe (4 personnes).',
    stats: {
      reservations: 5,
      nights: 20,
      spend: 760_000,
      visits: 3,
      leases: 1,
      satisfaction: 4.6,
      comments: 11,
      likes: 22,
      followers: 138,
      favoriteCities: 2,
    },
    visitsHistory: [
      {
        id: 'CL206-V1',
        property: 'Villa Golf Limbe',
        city: 'Limbe',
        date: '08 déc 2025',
        hour: '09:00',
        status: 'terminée',
        agent: 'Patrick',
        notes: 'A exigé générateur 20kVA.',
      },
      {
        id: 'CL206-V2',
        property: 'Maison Bonapriso Palm',
        city: 'Douala',
        date: '25 nov 2025',
        hour: '15:00',
        status: 'terminée',
        agent: 'Jason',
        notes: 'Souhaite agrandir terrasse avant séjour.',
      },
      {
        id: 'CL206-V3',
        property: 'Résidence Limbe Ocean',
        city: 'Limbe',
        date: '19 oct 2025',
        hour: '11:30',
        status: 'en attente',
        agent: 'Patrick',
        notes: 'Doit confirmer selon planning usine.',
      },
    ],
    leasesHistory: [
      {
        id: 'CL206-L1',
        property: 'Maison Bonapriso Palm',
        landlord: 'Linda K.',
        startDate: '01 mar 2024',
        endDate: '01 avr 2024',
        value: '1,1 M FCFA',
        status: 'clos',
      },
    ],
    timeline: [
      {
        id: 'CL206-T1',
        date: '18 déc',
        type: 'reservation',
        label: 'Séjour confirmé',
        detail: 'Villa Golf Limbe (28 déc - 03 jan).',
      },
      {
        id: 'CL206-T2',
        date: '10 déc',
        type: 'payment',
        label: 'Acompte reçu',
        detail: 'Versement 450 000 FCFA via virement bancaire.',
      },
      {
        id: 'CL206-T3',
        date: '26 nov',
        type: 'visit',
        label: 'Visite Maison Bonapriso',
        detail: 'Validation pièces communes avec équipe.',
      },
    ],
  },
};

type ListingStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ListingRecord = {
  id: string;
  title: string;
  type: string;
  city: string;
  district: string;
  price: number;
  priceType: 'jour' | 'mois';
  status: ListingStatus;
  owner: string;
  ownerLabel: string;
  images: number;
  videos: number;
  createdAt: string;
  furnished?: boolean;
  visits?: number;
  previewUrl?: string | null;
};

export const landlordListings: ListingRecord[] = [
  {
    id: 'LD-AN-01',
    title: 'Villa meublée - Bonapriso',
    type: 'Villa',
    city: 'Douala',
    district: 'Bonapriso',
    price: 550000,
    priceType: 'mois',
    status: 'pending',
    owner: 'Linda K.',
    ownerLabel: 'Bailleur',
    images: 12,
    videos: 2,
    createdAt: '12 déc 2025',
    furnished: true,
    visits: 24,
    previewUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'LD-AN-02',
    title: 'Studio Makepe',
    type: 'Studio',
    city: 'Douala',
    district: 'Makepe',
    price: 35000,
    priceType: 'jour',
    status: 'approved',
    owner: 'Pierre T.',
    ownerLabel: 'Bailleur',
    images: 8,
    videos: 1,
    createdAt: '11 déc 2025',
    furnished: false,
    visits: 12,
    previewUrl: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=320&q=80',
  },
  {
    id: 'LD-AN-03',
    title: 'Appartement 3 pièces - Bastos',
    type: 'Appartement',
    city: 'Yaoundé',
    district: 'Bastos',
    price: 250000,
    priceType: 'mois',
    status: 'approved',
    owner: 'Nadia S.',
    ownerLabel: 'Bailleur',
    images: 10,
    videos: 1,
    createdAt: '10 déc 2025',
    furnished: true,
    visits: 18,
    previewUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=320&q=80',
  },
];

export type HostMessageThread = LandlordMessageThread;

export const hostMessages: HostMessageThread[] = [
  {
    id: 'HOST-MSG-201',
    landlordName: 'Linda K.',
    landlordUsername: '@lindak',
    subject: 'Validation visite virtuelle',
    city: 'Kribi',
    phone: '+237 699 44 11 22',
    priority: 'high',
    status: 'open',
    unreadCount: 1,
    lastMessageAt: 'Aujourd’hui · 09:30',
    preview: 'Besoin d’un go pour publier la visite immersive du loft.',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'HOST-MSG-201-1',
        sender: 'landlord',
        content: 'Hello PUOL, est-ce que la visite immersive est prête côté app voyageur ?',
        timestamp: 'Aujourd’hui · 09:12',
      },
      {
        id: 'HOST-MSG-201-2',
        sender: 'support',
        content: 'On finalise la compression, je reviens vers toi avant midi.',
        timestamp: 'Aujourd’hui · 09:24',
      },
    ],
  },
  {
    id: 'HOST-MSG-202',
    landlordName: 'Pierre T.',
    landlordUsername: '@pierret',
    subject: 'Pack ménage premium',
    city: 'Yaoundé',
    phone: '+237 677 88 99 00',
    priority: 'medium',
    status: 'waiting',
    unreadCount: 0,
    lastMessageAt: 'Hier · 18:47',
    preview: 'Je veux activer le ménage premium sur deux appartements.',
    avatarUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'HOST-MSG-202-1',
        sender: 'landlord',
        content: 'Pouvez-vous activer le pack ménage premium sur Bastos et Makepe ?',
        timestamp: 'Hier · 18:05',
      },
      {
        id: 'HOST-MSG-202-2',
        sender: 'support',
        content: 'Oui, on synchronise avec l’équipe intendance et on vous confirme.',
        timestamp: 'Hier · 18:47',
      },
    ],
  },
  {
    id: 'HOST-MSG-203',
    landlordName: 'Nadia S.',
    landlordUsername: '@nadias',
    subject: 'Question sur calendrier',
    city: 'Douala',
    phone: '+237 690 77 33 55',
    priority: 'low',
    status: 'resolved',
    unreadCount: 0,
    lastMessageAt: '17 déc · 14:22',
    preview: 'Agenda bloqué sur la semaine du 24, besoin d’aide.',
    avatarUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'HOST-MSG-203-1',
        sender: 'landlord',
        content: 'Le calendrier se bloque sur la semaine du 24, comment débloquer ?',
        timestamp: '17 déc · 13:58',
      },
      {
        id: 'HOST-MSG-203-2',
        sender: 'support',
        content: 'Nous avons libéré la plage, vous pouvez reprogrammer les séjours.',
        timestamp: '17 déc · 14:22',
      },
    ],
  },
];

export const hostListings: ListingRecord[] = [
  {
    id: 'HOST-AN-21',
    title: 'Loft Kribi vue mer',
    type: 'Loft',
    city: 'Kribi',
    district: 'Mpalla',
    price: 90000,
    priceType: 'jour',
    status: 'pending',
    owner: 'Hôte Linda K.',
    ownerLabel: 'Hôte',
    images: 15,
    videos: 3,
    createdAt: '13 déc 2025',
    furnished: true,
  },
  {
    id: 'HOST-AN-22',
    title: 'Chambre Bonamoussadi',
    type: 'Chambre',
    city: 'Douala',
    district: 'Bonamoussadi',
    price: 18000,
    priceType: 'jour',
    status: 'approved',
    owner: 'Hôte Pierre T.',
    ownerLabel: 'Hôte',
    images: 6,
    videos: 1,
    createdAt: '09 déc 2025',
    furnished: false,
  },
];

export const hostListingDetails: Record<string, HostListingDetail> = {
  'HOST-AN-21': {
    ...hostListings[0],
    coverUrl: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
    ],
    description:
      'Loft lumineux face à l’océan, conçu pour les séjours premium à Kribi. Décoration artisanale locale et service d’intendance PUOL.',
    occupancy: 72,
    viewsCount: 980,
    commentsCount: 18,
    visits: 24,
    bookings: 6,
    rating: 4.95,
    amenities: ['Vue mer', 'Jacuzzi', 'Fibre optique', 'Conciergerie', 'Générateur'],
    ownerPhone: '+237 699 44 11 22',
    ownerUsername: '@lindak',
    ownerProfileId: 'HT-201',
    currentTenant: null,
    currentLeaseStart: null,
    currentLeaseEnd: null,
    notes: 'Préparer un shooting lifestyle pour la relance campagne digital.',
    depositAmount: 350000,
    minLeaseMonths: 1,
    guestCapacity: 4,
    propertyType: 'Loft',
    isAvailable: true,
    surfaceArea: 180,
    addressText: 'Route Royale Mpalla, Kribi',
    googleAddress: 'Route Royale, Kribi, Cameroun',
    formattedAddress: 'Route Royale Mpalla, Kribi',
    placeId: 'plc_host21',
    latitude: 2.9404,
    longitude: 9.9107,
    roomBreakdown: {
      livingRoom: 1,
      bedrooms: 2,
      kitchens: 1,
      bathrooms: 2,
      diningRooms: 1,
      toilets: 2,
    },
    mediaAssets: [
      {
        id: 'HOST-AN-21-media-1',
        type: 'photo',
        label: 'Terrasse panoramique',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'HOST-AN-21-media-2',
        type: 'photo',
        label: 'Salon principal',
        room: 'Salon',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'HOST-AN-21-media-3',
        type: 'video',
        label: 'Visite immersive',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=80',
        durationSeconds: 75,
        muted: false,
      },
    ],
  },
  'HOST-AN-22': {
    ...hostListings[1],
    coverUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=800&q=80',
    ],
    description:
      'Chambre moderne à Bonamoussadi, pensée pour les voyageurs business de passage. Process check-in autonome et ménage quotidien.',
    occupancy: 64,
    viewsCount: 640,
    commentsCount: 12,
    visits: 19,
    bookings: 4,
    rating: 4.6,
    amenities: ['Self check-in', 'Climatisation', 'Smart TV', 'Sécurité 24/7'],
    ownerPhone: '+237 677 88 99 00',
    ownerUsername: '@pierret',
    ownerProfileId: 'HT-178',
    currentTenant: 'Séjour court terme en cours',
    currentLeaseStart: '2024-12-10',
    currentLeaseEnd: '2024-12-20',
    notes: 'Prévoir pack photo lifestyle PUOL+ pour prochaine campagne.',
    depositAmount: 80000,
    minLeaseMonths: 0,
    guestCapacity: 2,
    propertyType: 'Chambre',
    isAvailable: false,
    surfaceArea: 35,
    addressText: 'Rue des Manguiers, Bonamoussadi, Douala',
    googleAddress: 'Rue des Manguiers, Douala, Cameroun',
    formattedAddress: 'Bonamoussadi, Douala',
    placeId: 'plc_host22',
    latitude: 4.0668,
    longitude: 9.7323,
    roomBreakdown: {
      livingRoom: 0,
      bedrooms: 1,
      kitchens: 0,
      bathrooms: 1,
      diningRooms: 0,
      toilets: 1,
    },
    mediaAssets: [
      {
        id: 'HOST-AN-22-media-1',
        type: 'photo',
        label: 'Espace nuit',
        room: 'Chambre',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'HOST-AN-22-media-2',
        type: 'photo',
        label: 'Salle de bain',
        room: 'Salle de bain',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'HOST-AN-22-media-3',
        type: 'video',
        label: 'Arrivée autonome',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=80',
        durationSeconds: 42,
        muted: true,
      },
    ],
  },
};

export type LandlordRoomBreakdown = {
  livingRoom: number;
  bedrooms: number;
  kitchens: number;
  bathrooms: number;
  diningRooms: number;
  toilets: number;
};

export type LandlordMediaAsset = {
  id: string;
  type: 'photo' | 'video';
  label: string;
  room?: string | null;
  thumbnailUrl: string;
  durationSeconds?: number;
  muted?: boolean;
};

export type LandlordListingDetail = ListingRecord & {
  coverUrl: string;
  gallery: string[];
  description: string;
  occupancy: number;
  viewsCount: number;
  commentsCount: number;
  visits: number;
  bookings: number;
  rating?: number;
  amenities: string[];
  ownerPhone: string;
  ownerUsername: string;
  ownerProfileId?: string;
  currentTenant?: string | null;
  currentLeaseStart?: string | null;
  currentLeaseEnd?: string | null;
  notes: string;
  depositAmount: number | null;
  minLeaseMonths: number | null;
  guestCapacity: number;
  propertyType: string;
  isCommercial?: boolean;
  isAvailable: boolean;
  surfaceArea?: number | null;
  addressText: string;
  googleAddress?: string;
  formattedAddress?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  roomBreakdown: LandlordRoomBreakdown;
  mediaAssets: LandlordMediaAsset[];
};

export type HostListingDetail = LandlordListingDetail;

export type HostProfile = {
  id: string;
  name: string;
  username: string;
  segment: 'premium' | 'core' | 'lite';
  city: string;
  staysHosted: number;
  listingsActive: number;
  guestsSupported: number;
  revenueShare: number;
  joinedAt: string;
  propertyTags: string[];
};

export const hostProfiles: HostProfile[] = [
  {
    id: 'HT-201',
    name: 'Linda K.',
    username: '@lindak',
    segment: 'premium',
    city: 'Douala',
    staysHosted: 128,
    listingsActive: 6,
    guestsSupported: 420,
    revenueShare: 2_800_000,
    joinedAt: '2023',
    propertyTags: ['Villas', 'Lofts', 'Studios'],
  },
  {
    id: 'HT-178',
    name: 'Pierre T.',
    username: '@pierret',
    segment: 'core',
    city: 'Yaoundé',
    staysHosted: 86,
    listingsActive: 4,
    guestsSupported: 265,
    revenueShare: 1_650_000,
    joinedAt: '2022',
    propertyTags: ['Appartements', 'Studios', 'Duplex'],
  },
  {
    id: 'HT-156',
    name: 'Amelia D.',
    username: '@ameliad',
    segment: 'premium',
    city: 'Kribi',
    staysHosted: 142,
    listingsActive: 5,
    guestsSupported: 512,
    revenueShare: 3_150_000,
    joinedAt: '2021',
    propertyTags: ['Villas', 'Resorts', 'Bungalows'],
  },
  {
    id: 'HT-089',
    name: 'Loïc M.',
    username: '@loicm',
    segment: 'lite',
    city: 'Bafoussam',
    staysHosted: 41,
    listingsActive: 3,
    guestsSupported: 118,
    revenueShare: 740_000,
    joinedAt: '2020',
    propertyTags: ['Colivings', 'Studios', 'Chambres'],
  },
];

export type HostListingHighlight = {
  id: string;
  title: string;
  city: string;
  type: string;
  occupancy: number;
  rating: number;
  coverUrl: string;
  revenue: string;
};

export type HostReservationSummary = {
  id: string;
  guest: string;
  stay: string;
  amount: string;
  status: 'à confirmer' | 'confirmée' | 'en litige';
};

export type HostTimelineEvent = {
  id: string;
  date: string;
  label: string;
  detail: string;
  type: 'reservation' | 'payout' | 'quality';
};

export type HostProfileDetail = HostProfile & {
  avatarUrl: string;
  email: string;
  phone: string;
  address: string;
  responseTime: string;
  satisfactionScore: number;
  acceptanceRate: number;
  notes: string;
  tags: string[];
  stats: {
    guests: number;
    nights: number;
    rating: number;
    payout: string;
  };
  engagement: {
    views: number;
    likes: number;
    comments: number;
  };
  listings: HostListingHighlight[];
  reservations: HostReservationSummary[];
  timeline: HostTimelineEvent[];
};

export const hostProfileDetails: Record<string, HostProfileDetail> = {
  'HT-201': {
    ...hostProfiles[0],
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
    email: 'Disponible via la ligne concierge',
    phone: '+237 699 22 55 11',
    address: 'Kribi · Littoral',
    responseTime: '21 min',
    satisfactionScore: 4.9,
    acceptanceRate: 96,
    notes: 'Experte séjours premium mer. Besoin d’un suivi shootings trimestriels.',
    tags: ['PUOL+', 'Conciergerie', 'Premium'],
    stats: {
      guests: 420,
      nights: 1180,
      rating: 4.92,
      payout: '12.4 M FCFA',
    },
    engagement: {
      views: 4820,
      likes: 318,
      comments: 126,
    },
    listings: [
      {
        id: 'HOST-AN-21',
        title: 'Loft Kribi vue mer',
        city: 'Kribi',
        type: 'Loft',
        occupancy: 87,
        rating: 4.95,
        coverUrl: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80',
        revenue: '3.2 M FCFA',
      },
      {
        id: 'HOST-AN-27',
        title: 'Villa Mbambe',
        city: 'Kribi',
        type: 'Villa',
        occupancy: 91,
        rating: 4.9,
        coverUrl: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=600&q=80',
        revenue: '4.5 M FCFA',
      },
    ],
    reservations: [
      { id: 'RES-440', guest: 'Sali A.', stay: '18-21 déc', amount: '420 000 FCFA', status: 'à confirmer' },
      { id: 'RES-438', guest: 'Marc L.', stay: '15-17 déc', amount: '280 000 FCFA', status: 'confirmée' },
      { id: 'RES-431', guest: 'Company X', stay: '05-12 jan', amount: '980 000 FCFA', status: 'confirmée' },
    ],
    timeline: [
      { id: 'HT-TL-01', date: '19 déc', label: 'Demande de payout', detail: 'Virement 980 000 FCFA déclenché', type: 'payout' },
      { id: 'HT-TL-02', date: '18 déc', label: 'Réservation corporate', detail: 'Séjour 7 nuits confirmé', type: 'reservation' },
      { id: 'HT-TL-03', date: '17 déc', label: 'Avis 5★', detail: 'Séjour Loft Kribi noté 5/5', type: 'quality' },
    ],
  },
  'HT-178': {
    ...hostProfiles[1],
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=200&h=200',
    email: 'Coordination via success manager',
    phone: '+237 677 44 55 66',
    address: 'Yaoundé · Bastos',
    responseTime: '35 min',
    satisfactionScore: 4.6,
    acceptanceRate: 89,
    notes: 'Souhaite automatiser l’onboarding voyageurs business.',
    tags: ['Business', 'Check-in autonome'],
    stats: {
      guests: 265,
      nights: 760,
      rating: 4.72,
      payout: '7.8 M FCFA',
    },
    engagement: {
      views: 3390,
      likes: 188,
      comments: 72,
    },
    listings: [
      {
        id: 'HOST-AN-22',
        title: 'Chambre Bonamoussadi',
        city: 'Douala',
        type: 'Chambre',
        occupancy: 78,
        rating: 4.7,
        coverUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
        revenue: '1.9 M FCFA',
      },
      {
        id: 'HOST-AN-30',
        title: 'Studio Bastos',
        city: 'Yaoundé',
        type: 'Studio',
        occupancy: 83,
        rating: 4.8,
        coverUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
        revenue: '2.4 M FCFA',
      },
    ],
    reservations: [
      { id: 'RES-420', guest: 'Clarisse N.', stay: '20-23 déc', amount: '180 000 FCFA', status: 'confirmée' },
      { id: 'RES-414', guest: 'Entreprise Y', stay: '02-05 jan', amount: '320 000 FCFA', status: 'à confirmer' },
    ],
    timeline: [
      { id: 'HT-TL-11', date: '18 déc', label: 'Incident résolu', detail: 'Check-in autonome rétabli', type: 'quality' },
      { id: 'HT-TL-12', date: '16 déc', label: 'Payout traité', detail: 'Versement 520 000 FCFA', type: 'payout' },
    ],
  },
};

export const landlordListingDetails: Record<string, LandlordListingDetail> = {
  'LD-AN-01': {
    ...landlordListings[0],
    coverUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?auto=format&fit=crop&w=800&q=80',
    ],
    description:
      'Villa haut de gamme entièrement meublée avec jardin privatif et service de conciergerie PUOL. Idéale pour des séjours longue durée corporate.',
    occupancy: 88,
    viewsCount: 1420,
    commentsCount: 36,
    visits: 42,
    bookings: 9,
    amenities: ['Piscine', 'Générateur', 'Conciergerie 24/7', 'Wifi Fibre', 'Sécurité privée'],
    ownerPhone: '+237 699 11 22 33',
    ownerUsername: '@lindak',
    ownerProfileId: 'BY-201',
    currentTenant: 'Société AfricInvest',
    currentLeaseStart: '2025-01-01',
    currentLeaseEnd: '2025-12-31',
    notes: 'Prévoir retouche photo de la chambre principale avant republication.',
    depositAmount: 1100000,
    minLeaseMonths: 12,
    guestCapacity: 6,
    propertyType: 'Villa',
    isAvailable: true,
    surfaceArea: 420,
    addressText: 'Rue Tokoto, Bonapriso, Douala',
    googleAddress: 'Rue Tokoto, Douala, Cameroun',
    formattedAddress: 'Rue Tokoto, Bonapriso, Douala',
    placeId: 'plc_ld01',
    latitude: 4.051056,
    longitude: 9.767869,
    roomBreakdown: {
      livingRoom: 2,
      bedrooms: 4,
      kitchens: 1,
      bathrooms: 3,
      diningRooms: 1,
      toilets: 4,
    },
    mediaAssets: [
      {
        id: 'LD-AN-01-media-1',
        type: 'photo',
        label: 'Façade & jardin',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-01-media-2',
        type: 'photo',
        label: 'Salon principal',
        room: 'Salon',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-01-media-3',
        type: 'photo',
        label: 'Suite parentale',
        room: 'Chambre',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-01-media-4',
        type: 'video',
        label: 'Visite 4K',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=80',
        durationSeconds: 95,
        muted: false,
      },
    ],
  },
  'LD-AN-02': {
    ...landlordListings[1],
    coverUrl: 'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
    ],
    description:
      'Studio moderne au cœur de Makepe. Cuisine équipée, wifi illimité et sécurité connectée. Cible idéale : jeunes actifs, couples en transition.',
    occupancy: 76,
    viewsCount: 980,
    commentsCount: 21,
    visits: 51,
    bookings: 12,
    amenities: ['Cuisine équipée', 'Climatisation', 'Wifi', 'Parking', 'Self Check-in'],
    ownerPhone: '+237 677 88 99 00',
    ownerUsername: '@pierret',
    ownerProfileId: 'BY-178',
    currentTenant: null,
    currentLeaseStart: null,
    currentLeaseEnd: null,
    notes: 'Le bailleur souhaite activer l’option ménage hebdomadaire payant.',
    depositAmount: 120000,
    minLeaseMonths: 6,
    guestCapacity: 2,
    propertyType: 'Studio',
    isAvailable: false,
    surfaceArea: 58,
    addressText: 'Impasse Safari, Makepe, Douala',
    googleAddress: 'Impasse Safari, Douala, Cameroun',
    formattedAddress: 'Impasse Safari, Makepe, Douala',
    placeId: 'plc_ld02',
    latitude: 4.097996,
    longitude: 9.734752,
    roomBreakdown: {
      livingRoom: 1,
      bedrooms: 1,
      kitchens: 1,
      bathrooms: 1,
      diningRooms: 0,
      toilets: 1,
    },
    mediaAssets: [
      {
        id: 'LD-AN-02-media-1',
        type: 'photo',
        label: 'Pièce à vivre',
        room: 'Salon',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-02-media-2',
        type: 'photo',
        label: 'Coin nuit',
        room: 'Chambre',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-02-media-3',
        type: 'video',
        label: 'Visite express',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
        durationSeconds: 47,
        muted: true,
      },
    ],
  },
  'LD-AN-03': {
    ...landlordListings[2],
    coverUrl: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1600&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=80',
    ],
    description:
      'Appartement lumineux situé à Bastos avec double séjour, balcon et vue dégagée. Partenariat avec entreprises minières pour bail longue durée.',
    occupancy: 91,
    viewsCount: 1575,
    commentsCount: 48,
    visits: 34,
    bookings: 7,
    amenities: ['Balcon', 'Office privé', 'Parking sécurisé', 'Fibre optique', 'Service ménage'],
    ownerPhone: '+237 650 12 54 10',
    ownerUsername: '@nadias',
    ownerProfileId: 'BY-098',
    currentTenant: 'Total Energies - équipe RH',
    currentLeaseStart: '2024-03-15',
    currentLeaseEnd: null,
    notes: 'Installer un détecteur de fumée connecté avant prochaine publication.',
    depositAmount: 500000,
    minLeaseMonths: 9,
    guestCapacity: 4,
    propertyType: 'Appartement',
    isAvailable: true,
    surfaceArea: 185,
    addressText: 'Avenue Rosa Parks, Bastos, Yaoundé',
    googleAddress: 'Avenue Rosa Parks, Yaoundé, Cameroun',
    formattedAddress: 'Avenue Rosa Parks, Bastos, Yaoundé',
    placeId: 'plc_ld03',
    latitude: 3.873179,
    longitude: 11.515889,
    roomBreakdown: {
      livingRoom: 1,
      bedrooms: 3,
      kitchens: 1,
      bathrooms: 2,
      diningRooms: 1,
      toilets: 2,
    },
    mediaAssets: [
      {
        id: 'LD-AN-03-media-1',
        type: 'photo',
        label: 'Séjour lumineux',
        room: 'Salon',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-03-media-2',
        type: 'photo',
        label: 'Cuisine équipée',
        room: 'Cuisine',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-03-media-3',
        type: 'photo',
        label: 'Suite principale',
        room: 'Chambre',
        thumbnailUrl:
          'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'LD-AN-03-media-4',
        type: 'video',
        label: 'Balcon & vue',
        room: null,
        thumbnailUrl:
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=600&q=80',
        durationSeconds: 62,
        muted: false,
      },
    ],
  },
};

export type LandlordRequestStatus = 'pending' | 'approved' | 'rejected';

export type LandlordRequest = {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: number;
  unitsPortfolio: number;
  submittedAt: string;
  motivation: string;
  documents: string[];
  avatarUrl: string;
  status: LandlordRequestStatus;
};

export const landlordRequests: LandlordRequest[] = [
  {
    id: 'REQ-203',
    fullName: 'Brice Nguema',
    firstName: 'Brice',
    lastName: 'Nguema',
    email: 'brice.nguema@example.com',
    phone: '+237 699 20 11 45',
    city: 'Douala',
    experienceYears: 4,
    unitsPortfolio: 3,
    submittedAt: '14 déc 2025',
    motivation: 'Souhaite déléguer la gestion de trois unités premium à Bonapriso et Bonamoussadi.',
    documents: ['CNI', 'RCCM', 'Titre foncier'],
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
    status: 'pending',
  },
  {
    id: 'REQ-204',
    fullName: 'Nadine Kouassi',
    firstName: 'Nadine',
    lastName: 'Kouassi',
    email: 'nadine.kouassi@example.com',
    phone: '+237 651 44 55 66',
    city: 'Yaoundé',
    experienceYears: 6,
    unitsPortfolio: 5,
    submittedAt: '12 déc 2025',
    motivation: 'Recherche un partenaire pour digitaliser la location de cinq appartements corporate à Bastos.',
    documents: ['CNI', 'Justificatif de domicile'],
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=200&h=200',
    status: 'pending',
  },
  {
    id: 'REQ-205',
    fullName: 'Sylvain Mebenga',
    firstName: 'Sylvain',
    lastName: 'Mebenga',
    email: 'sylvain.mebenga@example.com',
    phone: '+237 677 02 03 04',
    city: 'Douala',
    experienceYears: 2,
    unitsPortfolio: 2,
    submittedAt: '10 déc 2025',
    motivation: 'Veut confier ses deux studios meublés à un opérateur fiable pour assurer le taux d’occupation.',
    documents: ['CNI'],
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&w=200&h=200',
    status: 'approved',
  },
  {
    id: 'REQ-206',
    fullName: 'Clarisse Ndongo',
    firstName: 'Clarisse',
    lastName: 'Ndongo',
    email: 'clarisse.ndongo@example.com',
    phone: '+237 690 77 88 11',
    city: 'Kribi',
    experienceYears: 1,
    unitsPortfolio: 1,
    submittedAt: '09 déc 2025',
    motivation: 'Prépare l’ouverture d’un duplex balnéaire et souhaite bénéficier de la distribution PUOL.',
    documents: ['CNI', 'Titre foncier'],
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=200&h=200',
    status: 'rejected',
  },
];

export type LandlordProfile = {
  id: string;
  name: string;
  username: string;
  segment: 'premium' | 'core' | 'lite';
  city: string;
  leasesSigned: number;
  unitsManaged: number;
  tenantsTotal: number;
  revenueShare: number;
  lastActive: string;
  joinedAt: string;
};

export type LandlordLease = {
  id: string;
  unit: string;
  tenant: string;
  startDate: string;
  duration: string;
  value: string;
  status: 'actif' | 'terminé' | 'en préparation';
};

export type LandlordListingSummary = {
  id: string;
  title: string;
  city: string;
  status: 'en ligne' | 'en brouillon';
  price: string;
  type: string;
  updatedAt: string;
  previewUrl: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
};

export type LandlordTimelineEvent = {
  id: string;
  date: string;
  label: string;
  detail: string;
  type: 'lease' | 'moderation' | 'payment';
};

export type LandlordProfileDetail = LandlordProfile & {
  avatarUrl: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
  stats: {
    views: number;
    likes: number;
    comments: number;
    visits: number;
  };
  leases: LandlordLease[];
  listings: LandlordListingSummary[];
  timeline: LandlordTimelineEvent[];
};

export const landlordProfiles: LandlordProfile[] = [
  {
    id: 'BY-201',
    name: 'Linda K.',
    username: '@lindak',
    segment: 'premium',
    city: 'Douala',
    leasesSigned: 15,
    unitsManaged: 18,
    tenantsTotal: 15,
    revenueShare: 4_200_000,
    lastActive: 'Il y a 2h',
    joinedAt: '2022',
  },
  {
    id: 'BY-178',
    name: 'Pierre T.',
    username: '@pierret',
    segment: 'core',
    city: 'Yaoundé',
    leasesSigned: 8,
    unitsManaged: 11,
    tenantsTotal: 9,
    revenueShare: 2_300_000,
    lastActive: 'Il y a 1j',
    joinedAt: '2021',
  },
  {
    id: 'BY-098',
    name: 'Nadia S.',
    username: '@nadias',
    segment: 'premium',
    city: 'Douala',
    leasesSigned: 6,
    unitsManaged: 7,
    tenantsTotal: 6,
    revenueShare: 1_800_000,
    lastActive: 'Il y a 3h',
    joinedAt: '2023',
  },
  {
    id: 'BY-145',
    name: 'Brice N.',
    username: '@bricen',
    segment: 'core',
    city: 'Kribi',
    leasesSigned: 2,
    unitsManaged: 5,
    tenantsTotal: 2,
    revenueShare: 540_000,
    lastActive: 'Il y a 5j',
    joinedAt: '2020',
  },
  {
    id: 'BY-067',
    name: 'Loïc M.',
    username: '@loicm',
    segment: 'lite',
    city: 'Bafoussam',
    leasesSigned: 0,
    unitsManaged: 3,
    tenantsTotal: 0,
    revenueShare: 0,
    lastActive: 'Il y a 21j',
    joinedAt: '2019',
  },
  {
    id: 'BY-156',
    name: 'Amelia D.',
    username: '@ameliad',
    segment: 'premium',
    city: 'Yaoundé',
    leasesSigned: 12,
    unitsManaged: 14,
    tenantsTotal: 12,
    revenueShare: 5_100_000,
    lastActive: 'Il y a 4h',
    joinedAt: '2022',
  },
];

export const landlordProfileDetails: Record<string, LandlordProfileDetail> = {
  'BY-201': {
    ...landlordProfiles[0],
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
    email: 'linda.kayem@puol.app',
    phone: '+237 699 11 22 33',
    address: 'Bonapriso, Douala',
    notes: 'Portefeuille haut de gamme avec suivi VIP. Souhaite automatiser les renouvellements.',
    tags: ['Premium', 'VIP', 'Long terme'],
    stats: {
      views: 4820,
      likes: 318,
      comments: 126,
      visits: 54,
    },
    leases: [
      { id: 'LEASE-2103', unit: 'Villa Bonapriso', tenant: 'Sali A.', startDate: '15 nov 2025', duration: '12 mois', value: '780 000 FCFA', status: 'actif' },
      { id: 'LEASE-2058', unit: 'Appartement Bastos', tenant: 'Jean M.', startDate: '02 oct 2025', duration: '9 mois', value: '540 000 FCFA', status: 'actif' },
      { id: 'LEASE-1884', unit: 'Studio Makepe', tenant: 'Dianna P.', startDate: '04 juin 2025', duration: '6 mois', value: '210 000 FCFA', status: 'terminé' },
    ],
    listings: [
      {
        id: 'LD-AN-01',
        title: 'Villa meublée - Bonapriso',
        city: 'Douala',
        status: 'en ligne',
        price: '550 000 FCFA/mois',
        type: 'Villa',
        updatedAt: '13 déc',
        previewUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=320&q=80',
      },
      {
        id: 'LD-AN-05',
        title: 'Appartement Plateau',
        city: 'Yaoundé',
        status: 'en brouillon',
        price: '320 000 FCFA/mois',
        type: 'Appartement',
        updatedAt: '11 déc',
        previewUrl: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=320&q=80',
      },
      {
        id: 'LD-AN-07',
        title: 'Loft Akwa',
        city: 'Douala',
        status: 'en ligne',
        price: '230 000 FCFA/mois',
        type: 'Loft',
        updatedAt: '07 déc',
        previewUrl: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=320&q=80',
      },
    ],
    timeline: [
      { id: 'TL-01', date: '14 déc', label: 'Bail signé', detail: 'Bail #2103 validé · Villa Bonapriso', type: 'lease' },
      { id: 'TL-02', date: '12 déc', label: 'Paiement reçu', detail: 'Versement 420 000 FCFA sur portefeuille', type: 'payment' },
      { id: 'TL-03', date: '10 déc', label: 'Modération', detail: 'Annonce Plateau en attente de retouche photo', type: 'moderation' },
    ],
  },
  'BY-178': {
    ...landlordProfiles[1],
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&w=200&h=200',
    email: 'pierre.tankeu@puol.app',
    phone: '+237 677 88 99 00',
    address: 'Bastos, Yaoundé',
    notes: 'Portefeuille mixte centre-ville. Besoin d’accompagnement sur la modération visuelle.',
    tags: ['Core', 'Multi-sites'],
    stats: {
      views: 3390,
      likes: 188,
      comments: 72,
      visits: 41,
    },
    leases: [
      { id: 'LEASE-1990', unit: 'Studio Bastos', tenant: 'Aurélie S.', startDate: '01 déc 2025', duration: '6 mois', value: '240 000 FCFA', status: 'actif' },
      { id: 'LEASE-1801', unit: 'Appartement Golf', tenant: 'Marc K.', startDate: '18 août 2025', duration: '12 mois', value: '360 000 FCFA', status: 'actif' },
    ],
    listings: [
      {
        id: 'LD-AN-12',
        title: 'Studio Bastos',
        city: 'Yaoundé',
        status: 'en ligne',
        price: '180 000 FCFA/mois',
        type: 'Studio',
        updatedAt: '12 déc',
        previewUrl: 'https://images.unsplash.com/photo-1484100356142-db6ab6244067?auto=format&fit=crop&w=320&q=80',
      },
      {
        id: 'LD-AN-15',
        title: 'Appartement Golf',
        city: 'Yaoundé',
        status: 'en brouillon',
        price: '300 000 FCFA/mois',
        type: 'Appartement',
        updatedAt: '09 déc',
        previewUrl: 'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=320&q=80',
      },
    ],
    timeline: [
      { id: 'TL-11', date: '13 déc', label: 'Bail signé', detail: 'Bail #1990 · Studio Bastos', type: 'lease' },
      { id: 'TL-12', date: '10 déc', label: 'Modération', detail: 'Photos Studio Bastos relues', type: 'moderation' },
    ],
  },
  'BY-098': {
    ...landlordProfiles[2],
    avatarUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=facearea&w=200&h=200',
    email: 'nadia.song@puol.app',
    phone: '+237 650 12 54 10',
    address: 'Bonapriso, Douala',
    notes: 'Profil en croissance, en train d’ajouter 2 nouvelles unités. Besoin d’optimiser la visibilité.',
    tags: ['Premium', 'Expansion'],
    stats: {
      views: 2175,
      likes: 132,
      comments: 44,
      visits: 28,
    },
    leases: [
      { id: 'LEASE-2022', unit: 'Studio Akwa', tenant: 'Pauline V.', startDate: '03 déc 2025', duration: '9 mois', value: '270 000 FCFA', status: 'actif' },
    ],
    listings: [
      {
        id: 'LD-AN-18',
        title: 'Studio Akwa',
        city: 'Douala',
        status: 'en ligne',
        price: '120 000 FCFA/mois',
        type: 'Studio',
        updatedAt: '12 déc',
        previewUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=320&q=80',
      },
      {
        id: 'LD-AN-19',
        title: 'Mini-loft Deïdo',
        city: 'Douala',
        status: 'en brouillon',
        price: '145 000 FCFA/mois',
        type: 'Loft',
        updatedAt: '11 déc',
        previewUrl: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=320&q=80',
      },
    ],
    timeline: [
      { id: 'TL-21', date: '12 déc', label: 'Annonce publiée', detail: 'Mini-loft Deïdo soumis à la modération', type: 'moderation' },
      { id: 'TL-22', date: '04 déc', label: 'Bail signé', detail: 'Bail #2022 · Studio Akwa', type: 'lease' },
    ],
  },
};

export const landlordVisits: VisitRecord[] = [
  {
    id: 'LD-VIS-778',
    property: 'Studio Ndogpassi',
    visitor: 'Client #CL72',
    date: '16 Déc 2025',
    time: '10:00',
    status: 'pending',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6XX XX XX XX',
    city: 'Douala',
  },
  {
    id: 'LD-VIS-779',
    property: 'Duplex Bali',
    visitor: 'Client #CL11',
    date: '16 Déc 2025',
    time: '15:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6YY YY YY YY',
    city: 'Douala',
  },
  {
    id: 'LD-VIS-780',
    property: 'Villa Bastos',
    visitor: 'Client #CL03',
    date: '18 Déc 2025',
    time: '11:30',
    status: 'pending',
    paymentStatus: 'pending',
    amount: '5 000 FCFA',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Yaoundé',
  },
];

export type LandlordMessageThread = {
  id: string;
  landlordName: string;
  landlordUsername: string;
  subject: string;
  city: string;
  phone: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'waiting' | 'resolved';
  unreadCount: number;
  lastMessageAt: string;
  preview: string;
  avatarUrl: string;
  messages: {
    id: string;
    sender: 'landlord' | 'support';
    content: string;
    timestamp: string;
  }[];
};

export const landlordMessages: LandlordMessageThread[] = [
  {
    id: 'MSG-001',
    landlordName: 'Linda K.',
    landlordUsername: '@lindak',
    subject: 'Suppression annonce Bonapriso',
    city: 'Douala',
    phone: '+237 699 11 22 33',
    priority: 'high',
    status: 'open',
    unreadCount: 2,
    lastMessageAt: 'Aujourd’hui · 10:24',
    preview: 'Besoin de retirer l’annonce le temps des travaux...',
    avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'MSG-001-1',
        sender: 'landlord',
        content: 'Bonjour l’équipe PUOL, je dois retirer la villa Bonapriso pendant 2 semaines pour travaux.',
        timestamp: 'Aujourd’hui · 09:58',
      },
      {
        id: 'MSG-001-2',
        sender: 'support',
        content: 'Bonjour Linda, souhaitez-vous la mettre en brouillon ou la masquer ?',
        timestamp: 'Aujourd’hui · 10:12',
      },
      {
        id: 'MSG-001-3',
        sender: 'landlord',
        content: 'Merci ! Il faut simplement masquer l’annonce et prévenir les clients en attente.',
        timestamp: 'Aujourd’hui · 10:24',
      },
    ],
  },
  {
    id: 'MSG-002',
    landlordName: 'Pierre T.',
    landlordUsername: '@pierret',
    subject: 'Question sur répartition des loyers',
    city: 'Yaoundé',
    phone: '+237 677 44 55 66',
    priority: 'medium',
    status: 'waiting',
    unreadCount: 0,
    lastMessageAt: 'Hier · 18:03',
    preview: 'Pouvez-vous détailler la part PUOL vs propriétaire ?',
    avatarUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'MSG-002-1',
        sender: 'landlord',
        content: 'Pouvez-vous détailler la part PUOL vs propriétaire pour le portefeuille Bastos ?',
        timestamp: 'Hier · 17:42',
      },
      {
        id: 'MSG-002-2',
        sender: 'support',
        content: 'Bien sûr Pierre, la répartition est de 80% propriétaire / 20% PUOL, hors frais ménage.',
        timestamp: 'Hier · 18:03',
      },
    ],
  },
  {
    id: 'MSG-003',
    landlordName: 'Nadia S.',
    landlordUsername: '@nadias',
    subject: 'Ajout d’un nouveau duplex PUOL+',
    city: 'Douala',
    phone: '+237 690 77 33 55',
    priority: 'low',
    status: 'resolved',
    unreadCount: 0,
    lastMessageAt: '17 déc · 11:15',
    preview: 'J’ai soumis les photos et attends validation du duplex...',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&w=200&h=200',
    messages: [
      {
        id: 'MSG-003-1',
        sender: 'landlord',
        content: 'Bonjour, j’ai soumis les photos du duplex PUOL+. Pouvez-vous confirmer la réception ?',
        timestamp: '17 déc · 10:48',
      },
      {
        id: 'MSG-003-2',
        sender: 'support',
        content: 'Bien reçu Nadia ! L’équipe contenus les valide d’ici 24h et revient vers vous.',
        timestamp: '17 déc · 11:15',
      },
    ],
  },
];

export const hostAnnonces = [
  { id: 'HOST-AN-33', title: 'Colocation Akwa', status: 'Publié', occupancy: '82%', updatedAt: '13 déc' },
  { id: 'HOST-AN-34', title: 'Studio Bonamoussadi', status: 'Brouillon', occupancy: '-', updatedAt: '12 déc' },
  { id: 'HOST-AN-35', title: 'Appartement Makepe', status: 'Publié', occupancy: '50%', updatedAt: '11 déc' },
];

export const hostReservations = [
  { id: 'HOST-RES-91', client: 'Sali A.', dates: '18-21 déc', amount: '120 000 XAF', status: 'à confirmer' },
  { id: 'HOST-RES-92', client: 'Marc L.', dates: '20-23 déc', amount: '180 000 XAF', status: 'confirmée' },
];

export const hostVisits: VisitRecord[] = [
  {
    id: 'HOST-VIS-31',
    property: 'Appartement Makepe',
    visitor: 'Client #CL21',
    date: '17 Déc 2025',
    time: '11:00',
    status: 'pending',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6XX XX XX XX',
    city: 'Douala',
  },
  {
    id: 'HOST-VIS-32',
    property: 'Loft Kribi vue mer',
    visitor: 'Client #CL44',
    date: '18 Déc 2025',
    time: '09:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    amount: '5 000 FCFA',
    phone: '+237 6YY YY YY YY',
    city: 'Kribi',
  },
  {
    id: 'HOST-VIS-33',
    property: 'Colocation Akwa',
    visitor: 'Client #CL58',
    date: '20 Déc 2025',
    time: '16:30',
    status: 'pending',
    paymentStatus: 'pending',
    amount: '5 000 FCFA',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Douala',
  },
];

export type ClientMessageThread = {
  id: string;
  clientName: string;
  clientUsername: string;
  subject: string;
  city: string;
  phone: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'waiting' | 'resolved';
  unreadCount: number;
  lastMessageAt: string;
  preview: string;
  avatarUrl: string;
  messages: {
    id: string;
    sender: 'client' | 'support';
    content: string;
    timestamp: string;
  }[];
};

export const clientMessages: ClientMessageThread[] = [
  {
    id: 'CL-MSG-501',
    clientName: 'Sarah Nkomo',
    clientUsername: '@sarah_nk',
    subject: 'Accès visite immersive Kribi',
    city: 'Douala',
    phone: '+237 699 88 45 11',
    priority: 'high',
    status: 'open',
    unreadCount: 2,
    lastMessageAt: 'Aujourd’hui · 11:42',
    preview: 'Je n’arrive pas à lancer la visite virtuelle réservée hier.',
    avatarUrl: clientProfiles[0].avatarUrl,
    messages: [
      {
        id: 'CL-MSG-501-1',
        sender: 'client',
        content: 'Bonjour, la visite virtuelle pour la villa Kribi ne se lance pas côté application.',
        timestamp: 'Aujourd’hui · 11:18',
      },
      {
        id: 'CL-MSG-501-2',
        sender: 'support',
        content: 'Merci Sarah, on vérifie le flux vidéo et on revient vers vous.',
        timestamp: 'Aujourd’hui · 11:32',
      },
      {
        id: 'CL-MSG-501-3',
        sender: 'client',
        content: 'Ok parfait, j’attends votre confirmation.',
        timestamp: 'Aujourd’hui · 11:42',
      },
    ],
  },
  {
    id: 'CL-MSG-502',
    clientName: 'Ibrahim Akoa',
    clientUsername: '@ibraakoa',
    subject: 'Facturation acompte Colocation Akwa',
    city: 'Yaoundé',
    phone: '+237 677 21 90 54',
    priority: 'medium',
    status: 'waiting',
    unreadCount: 0,
    lastMessageAt: 'Hier · 19:05',
    preview: 'Je veux vérifier que l’acompte a bien été reçu avant la visite.',
    avatarUrl: clientProfiles[1].avatarUrl,
    messages: [
      {
        id: 'CL-MSG-502-1',
        sender: 'client',
        content: 'Pouvez-vous confirmer la réception de mon acompte pour la colocation Akwa ?',
        timestamp: 'Hier · 18:32',
      },
      {
        id: 'CL-MSG-502-2',
        sender: 'support',
        content: 'Oui Ibrahim, le paiement est bien enregistré, la visite reste confirmée pour 10h.',
        timestamp: 'Hier · 19:05',
      },
    ],
  },
  {
    id: 'CL-MSG-503',
    clientName: 'Liliane Fotso',
    clientUsername: '@lili_fotso',
    subject: 'Signature bail Bastos',
    city: 'Kribi',
    phone: '+237 690 11 22 33',
    priority: 'low',
    status: 'resolved',
    unreadCount: 0,
    lastMessageAt: '16 déc · 15:10',
    preview: 'Merci pour l’envoi du bail, j’ai pu le signer électroniquement.',
    avatarUrl: clientProfiles[2].avatarUrl,
    messages: [
      {
        id: 'CL-MSG-503-1',
        sender: 'client',
        content: 'Hello PUOL, je n’ai pas reçu le lien de signature du bail Bastos.',
        timestamp: '16 déc · 14:28',
      },
      {
        id: 'CL-MSG-503-2',
        sender: 'support',
        content: 'On vous renvoie immédiatement le lien sécurisé par SMS.',
        timestamp: '16 déc · 14:44',
      },
      {
        id: 'CL-MSG-503-3',
        sender: 'client',
        content: 'Lien reçu et bail signé, merci beaucoup !',
        timestamp: '16 déc · 15:10',
      },
    ],
  },
];

export const landlordSubtabs = [
  { id: 'buyers', label: 'Bailleurs', description: 'Liste maîtres et performance portefeuille', icon: Users },
  { id: 'annonces', label: 'Annonces', description: 'Vue complète des annonces bailleurs', icon: Home },
  { id: 'visits', label: 'Visites', description: 'Organisation des visites assistées', icon: Eye },
  { id: 'requests', label: 'Demandes', description: 'Candidatures pour devenir Landlord', icon: ClipboardList },
  { id: 'messages', label: 'Messages', description: 'Tickets et conversations', icon: MessageSquare },
];

export const hostSubtabs = [
  { id: 'hosts', label: 'Hôtes', description: 'Réseau d’opérateurs PUOL+', icon: Users },
  { id: 'annonces', label: 'Annonces', description: 'Performances et statuts', icon: Home },
  { id: 'reservations', label: 'Réservations', description: 'Flux à confirmer ou encaisser', icon: ClipboardList },
  { id: 'demandes', label: 'Demandes', description: 'Candidatures pour devenir Host', icon: ClipboardList },
  { id: 'visits', label: 'Demandes de visite', description: 'Suivi des créneaux proposés', icon: Eye },
  { id: 'messages', label: 'Messages', description: 'Communication hôte ↔ back-office', icon: MessageSquare },
];

export const clientSubtabs = [
  { id: 'clients', label: 'Clients', description: 'Profils et activité clients', icon: Users },
  { id: 'support', label: 'Support', description: 'Messagerie client ↔ back-office', icon: Mail },
];

const getListingStatusBadge = (status: ListingStatus) => {
  const variants = {
    pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
    approved: { label: 'Approuvée', className: 'bg-green-100 text-green-700' },
    rejected: { label: 'Refusée', className: 'bg-red-100 text-red-700' },
    suspended: { label: 'Suspendue', className: 'bg-gray-100 text-gray-700' },
  };
  return variants[status];
};

export type ListingFilters = {
  search: string;
  status: string;
  type: string;
};

type ListingsBoardConfig = {
  listings: ListingRecord[];
  filters: ListingFilters;
  onFilterChange: (patch: Partial<ListingFilters>) => void;
  title: string;
  description: string;
  ownerLabel: string;
};

export function ListingsBoard({ listings, filters, onFilterChange, title, description, ownerLabel }: ListingsBoardConfig) {
  const pendingCount = listings.filter((item) => item.status === 'pending').length;
  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      listing.city.toLowerCase().includes(filters.search.toLowerCase()) ||
      listing.district.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || listing.status === filters.status;
    const matchesType = filters.type === 'all' || listing.type === filters.type;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-gray-900">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <Button className="bg-[#2ECC71] hover:bg-[#27ae60] text-white rounded-xl">
          Nouvelle annonce
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white">
            Toutes ({listings.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white">
            En attente ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg data-[state=active]:bg-white">
            Approuvées
          </TabsTrigger>
          <TabsTrigger value="moderation" className="rounded-lg data-[state=active]:bg-white">
            File de modération
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par titre, ville, quartier..."
                      value={filters.search}
                      onChange={(e) => onFilterChange({ search: e.target.value })}
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
                <Select value={filters.status} onValueChange={(value) => onFilterChange({ status: value })}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="approved">Approuvées</SelectItem>
                    <SelectItem value="rejected">Refusées</SelectItem>
                    <SelectItem value="suspended">Suspendues</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(value) => onFilterChange({ type: value })}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="Studio">Studio</SelectItem>
                    <SelectItem value="Chambre">Chambre</SelectItem>
                    <SelectItem value="Appartement">Appartement</SelectItem>
                    <SelectItem value="Villa">Villa</SelectItem>
                    <SelectItem value="Loft">Loft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>{ownerLabel}</TableHead>
                  <TableHead>Médias</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => {
                  const statusBadge = getListingStatusBadge(listing.status);
                  return (
                    <TableRow key={listing.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">{listing.title}</p>
                            {listing.furnished && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Meublé
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{listing.type}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900">{listing.city}</p>
                          <p className="text-gray-500">{listing.district}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-gray-900">{listing.price.toLocaleString()} FCFA</p>
                          <p className="text-gray-500">/ {listing.priceType}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{listing.owner}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>{listing.images} photos</span>
                          <span>{listing.videos} vidéos</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{listing.createdAt}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {listing.status === 'pending' && (
                              <>
                                <DropdownMenuItem className="text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Refuser
                                </DropdownMenuItem>
                              </>
                            )}
                            {listing.status === 'approved' && (
                              <DropdownMenuItem className="text-[#2ECC71]">
                                <FileCheck className="w-4 h-4 mr-2" />
                                Contrat signé
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">File de modération</h3>
            <p className="text-gray-500">{pendingCount} annonces en attente de validation</p>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Annonces approuvées</h3>
            <p className="text-gray-500">Liste des annonces validées et en ligne</p>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card className="p-8 text-center">
            <Filter className="w-12 h-12 mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl text-gray-900 mb-2">Modération avancée</h3>
            <p className="text-gray-500">Outils de vérification automatique</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function UsersManagement() {
  const [activeRole, setActiveRole] = useState<RoleKey>('landlord');
  const [activeSubtabByRole, setActiveSubtabByRole] = useState<Record<RoleKey, string>>({
    landlord: 'annonces',
    host: 'annonces',
    client: 'reservations',
  });
  const [landlordListingFilters, setLandlordListingFilters] = useState<ListingFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [hostListingFilters, setHostListingFilters] = useState<ListingFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const stats = useMemo(
    () => [
      { label: 'Bailleurs', value: '214', trend: '+8 cette semaine' },
      { label: 'Hôtes actifs', value: '152', trend: '+5 nouvelles entrées' },
      { label: 'Clients vérifiés', value: '6 920', trend: '214 nouveaux' },
      { label: 'Tickets ouverts', value: '38', trend: '12 critiques' },
    ],
    [],
  );

  const renderLandlordSubtab = (tab: string) => {
    switch (tab) {
      case 'annonces':
        return (
          <ListingsBoard
            listings={landlordListings}
            filters={landlordListingFilters}
            onFilterChange={(patch) =>
              setLandlordListingFilters((prev) => ({ ...prev, ...patch }))
            }
            title="Annonces Bailleurs"
            description="Vue détaillée des annonces publiées par les bailleurs"
            ownerLabel="Bailleur"
          />
        );
      case 'requests':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {landlordRequests.map((request) => (
              <Card key={request.id} className="p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">{request.id}</p>
                    <p className="text-lg font-semibold text-gray-900">{request.fullName}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 capitalize">{request.status}</Badge>
                </div>
                <p className="text-sm text-gray-600">Déposée le {request.submittedAt}</p>
                <div className="flex flex-wrap gap-2">
                  {request.documents.map((doc) => (
                    <Badge key={doc} variant="secondary" className="rounded-full">
                      {doc}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1" size="sm">
                    Approuver
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1">
                    Refuser
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        );
      case 'visits':
        return (
          <VisitsBoard
            visits={landlordVisits}
            feeLabel="Frais bailleurs"
            feeAmount="5 000 FCFA"
            searchPlaceholder="Filtrer par bien, client ou ville..."
          />
        );
      case 'messages':
        return (
          <div className="space-y-3">
            {landlordMessages.map((msg) => (
              <Card key={msg.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{msg.id}</p>
                  <p className="text-base font-semibold text-gray-900">{msg.subject}</p>
                  <p className="text-sm text-gray-500">{msg.landlordName}</p>
                </div>
                {msg.unreadCount > 0 ? (
                  <Badge className="bg-sky-100 text-sky-700">{msg.unreadCount} non lus</Badge>
                ) : (
                  <Badge variant="outline">Lu</Badge>
                )}
              </Card>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const renderHostSubtab = (tab: string) => {
    switch (tab) {
      case 'annonces':
        return (
          <ListingsBoard
            listings={hostListings}
            filters={hostListingFilters}
            onFilterChange={(patch) =>
              setHostListingFilters((prev) => ({ ...prev, ...patch }))
            }
            title="Annonces Hôtes"
            description="Monitoring des annonces côté hôtes et opérations"
            ownerLabel="Hôte"
          />
        );
      case 'reservations':
        return (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réservation</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hostReservations.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.id}</TableCell>
                    <TableCell>{res.client}</TableCell>
                    <TableCell>{res.dates}</TableCell>
                    <TableCell>{res.amount}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-700 capitalize">{res.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm">Décision</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
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
        return (
          <Card className="p-6 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto text-blue-500 mb-3" />
            <p>Centre de messagerie hôte à activer</p>
          </Card>
        );
      default:
        return null;
    }
  };

  const renderClientSubtab = (tab: string) => {
    switch (tab) {
      case 'clients':
        return (
          <Card className="rounded-3xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead>Client</TableHead>
                  <TableHead>Segment</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Visites</TableHead>
                  <TableHead>Baux signés</TableHead>
                  <TableHead>Satisfaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProfiles.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="font-semibold text-gray-900">{client.fullName}</div>
                      <p className="text-xs text-gray-500">{client.phone}</p>
                    </TableCell>
                    <TableCell className="uppercase text-xs text-gray-500">{client.segment}</TableCell>
                    <TableCell>{client.city}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{client.visitsBooked}</TableCell>
                    <TableCell className="font-semibold text-gray-900">{client.leasesSigned}</TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-50 text-emerald-700 rounded-full">
                        {client.satisfaction.toFixed(1)}/5
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        );
      case 'support':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {clientMessages.map((thread) => (
              <Card key={thread.id} className="p-5 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{thread.clientName}</p>
                    <p className="text-xs text-gray-500">{thread.city}</p>
                  </div>
                  <Badge
                    className={cn(
                      'rounded-full text-xs capitalize',
                      thread.status === 'open'
                        ? 'bg-emerald-100 text-emerald-700'
                        : thread.status === 'waiting'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700',
                    )}
                  >
                    {thread.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{thread.subject}</p>
                <p className="text-xs text-gray-400">{thread.lastMessageAt}</p>
              </Card>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const renderRolePanel = (role: RoleKey) => {
    const roleMeta = roleTabs[role];
    const subtabs =
      role === 'landlord' ? landlordSubtabs : role === 'host' ? hostSubtabs : clientSubtabs;
    const activeSubtab = activeSubtabByRole[role];

    return (
      <div className="space-y-5">
        <Card>
          <CardContent className="p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-gray-500 uppercase">{roleMeta.label}</p>
              <h2 className="text-2xl font-semibold text-gray-900">{roleMeta.description}</h2>
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline">
                Export CSV
              </Button>
              <Button size="sm">Ajouter une action</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeSubtab}
          onValueChange={(value) =>
            setActiveSubtabByRole((prev) => ({ ...prev, [role]: value }))
          }
          className="w-full"
        >
          <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap">
            {subtabs.map((tab) => {
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
          {subtabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{tab.label}</p>
                  <p className="text-sm text-gray-500">{tab.description}</p>
                </div>
              </div>
              {role === 'landlord' && renderLandlordSubtab(tab.id)}
              {role === 'host' && renderHostSubtab(tab.id)}
              {role === 'client' && renderClientSubtab(tab.id)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl text-gray-900">Gestion des profils</h1>
        <p className="text-gray-500 mt-1">
          Modération centralisée des bailleurs, hôtes et clients Esppo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5 space-y-2">
              <p className="text-sm text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeRole} onValueChange={(value) => setActiveRole(value as RoleKey)}>
        <TabsList className="bg-gray-100 p-1 rounded-xl flex flex-wrap">
          {(Object.keys(roleTabs) as RoleKey[]).map((role) => {
            const meta = roleTabs[role];
            const Icon = meta.icon;
            return (
              <TabsTrigger
                key={role}
                value={role}
                className="rounded-lg data-[state=active]:bg-white flex items-center gap-2 px-4 py-2"
              >
                <Icon className={`w-4 h-4 ${meta.accent}`} />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="landlord" className="mt-6">
          {renderRolePanel('landlord')}
        </TabsContent>
        <TabsContent value="host" className="mt-6">
          {renderRolePanel('host')}
        </TabsContent>
        <TabsContent value="client" className="mt-6">
          {renderRolePanel('client')}
        </TabsContent>
      </Tabs>
    </div>
  );
}