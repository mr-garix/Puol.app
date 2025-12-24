import { Home, ClipboardList, Eye, MessageSquare, Shield, Mail } from 'lucide-react';

import type { ListingRecord } from '../shared/ListingsBoard';
import type { VisitRecord } from '../../VisitsManagement';

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
    owner: 'Bailleur #A21',
    ownerLabel: 'Bailleur',
    images: 12,
    videos: 2,
    createdAt: '12 déc 2025',
    furnished: true,
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
    owner: 'Bailleur #B11',
    ownerLabel: 'Bailleur',
    images: 8,
    videos: 1,
    createdAt: '11 déc 2025',
    furnished: false,
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
    owner: 'Bailleur #C07',
    ownerLabel: 'Bailleur',
    images: 10,
    videos: 1,
    createdAt: '10 déc 2025',
    furnished: true,
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
    owner: 'Host Linda K.',
    ownerLabel: 'Host',
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
    owner: 'Host Pierre T.',
    ownerLabel: 'Host',
    images: 6,
    videos: 1,
    createdAt: '09 déc 2025',
    furnished: false,
  },
];

export const landlordRequests = [
  { id: 'REQ-203', name: 'Brice N.', submittedAt: '14 déc', documents: ['CNI', 'RCCM'], status: 'pending' },
  { id: 'REQ-204', name: 'Nadine K.', submittedAt: '12 déc', documents: ['CNI'], status: 'review' },
];

export const landlordReservations = [
  { id: 'LD-RES-81', client: 'Diane K.', dates: '18-22 déc', amount: '240 000 FCFA', status: 'à vérifier' },
  { id: 'LD-RES-82', client: 'Franck T.', dates: '21-25 déc', amount: '315 000 FCFA', status: 'confirmée' },
  { id: 'LD-RES-83', client: 'Sami L.', dates: '27-30 déc', amount: '150 000 FCFA', status: 'en litige' },
];

export const landlordVisits: VisitRecord[] = [
  {
    id: 'LD-VIS-778',
    property: 'Studio Ndogpassi',
    propertyImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL72',
    date: '16 déc 2025',
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
    propertyImage: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL11',
    date: '16 déc 2025',
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
    propertyImage: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL03',
    date: '18 déc 2025',
    time: '11:30',
    status: 'pending',
    paymentStatus: 'pending',
    amount: '5 000 FCFA',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Yaoundé',
  },
];

export const landlordMessages = [
  { id: 'MSG-001', subject: 'Suppression annonce', from: 'Bailleur #A21', unread: true },
  { id: 'MSG-002', subject: 'Demande d’assistance', from: 'Bailleur #B18', unread: false },
];

export const hostReservations = [
  { id: 'HOST-RES-91', client: 'Sali A.', dates: '18-21 déc', amount: '120 000 FCFA', status: 'à confirmer' },
  { id: 'HOST-RES-92', client: 'Marc L.', dates: '20-23 déc', amount: '180 000 FCFA', status: 'confirmée' },
];

export const hostVisits: VisitRecord[] = [
  {
    id: 'HOST-VIS-31',
    property: 'Appartement Makepe',
    propertyImage: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL21',
    date: '17 déc 2025',
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
    propertyImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL44',
    date: '18 déc 2025',
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
    propertyImage: 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=400&q=80',
    visitor: 'Client #CL58',
    date: '20 déc 2025',
    time: '16:30',
    status: 'pending',
    paymentStatus: 'pending',
    amount: '5 000 FCFA',
    phone: '+237 6ZZ ZZ ZZ ZZ',
    city: 'Douala',
  },
];

export const clientReservations = [
  { id: 'CL-RES-101', property: 'Studio Bastos', host: 'Linda K.', dates: '15-17 déc', status: 'en paiement' },
  { id: 'CL-RES-102', property: 'Duplex Bonamoussadi', host: 'Pierre T.', dates: '20-25 déc', status: 'confirmée' },
];

export const clientSupport = [
  { id: 'CL-TKT-44', topic: 'Demande remboursement', createdAt: '13 déc', priority: 'haute' },
  { id: 'CL-TKT-45', topic: 'Problème accès visite', createdAt: '14 déc', priority: 'moyenne' },
];

export const clientDemands = [
  { id: 'CL-REQ-11', type: 'Devenir host', submittedAt: '10 déc', status: 'à vérifier' },
  { id: 'CL-REQ-12', type: 'Upgrade profil corporate', submittedAt: '12 déc', status: 'review' },
];

export const landlordSubtabs = [
  { id: 'annonces', label: 'Annonces', description: 'Vue complète des annonces bailleurs', icon: Home },
  { id: 'reservations', label: 'Réservations', description: 'Suivi des flux bailleurs', icon: ClipboardList },
  { id: 'visites', label: 'Visites', description: 'Organisation des visites assistées', icon: Eye },
  { id: 'demandes', label: 'Demandes', description: 'Candidatures bailleurs', icon: ClipboardList },
  { id: 'messages', label: 'Messages', description: 'Tickets et conversations', icon: MessageSquare },
];

export const hostSubtabs = [
  { id: 'annonces', label: 'Annonces', description: 'Performances et statuts', icon: Home },
  { id: 'reservations', label: 'Réservations', description: 'Flux à confirmer ou encaisser', icon: ClipboardList },
  { id: 'visites', label: 'Demandes de visite', description: 'Suivi des créneaux proposés', icon: Eye },
  { id: 'messages', label: 'Messages', description: 'Communication Host ↔ Back-office', icon: MessageSquare },
];

export const clientSubtabs = [
  { id: 'reservations', label: 'Réservations', description: 'Historique et incidents', icon: ClipboardList },
  { id: 'demandes', label: 'Demandes', description: 'Upgrades, vérifications, support', icon: Shield },
  { id: 'support', label: 'Support', description: 'Tickets client ↔ agents', icon: Mail },
];
