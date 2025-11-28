import { Linking } from 'react-native';

export type PropertyType = 'studio' | 'chambre' | 'apartment' | 'house' | 'villa' | 'boutique';

export type PriceType = 'daily' | 'monthly';

export interface PropertyData {
  id: string;
  type: PropertyType;
  isFurnished: boolean;
  title: string;
  description: string;
  price: string;
  priceType: PriceType;
  deposit?: string;
  location: {
    address: string;
    neighborhood: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  images: string[];
  landlord: {
    id?: string;
    name: string;
    avatar: string;
    verified: boolean;
    rating: number;
    reviewsCount: number;
    username?: string | null;
    phone?: string | null;
  };
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  livingRooms?: number;
  surfaceArea?: string;
  likes: number;
  views: number;
  shares: number;
  availableFrom?: string;
  availableUntil?: string;
  amenities: string[];
  phoneNumber?: string;
  whatsapp?: string;
}

export const AMENITIES_FURNISHED = [
  'Wifi',
  'Climatisation',
  'Parking',
  'Sécurité 24/24',
  'Eau 24/24',
  'Groupe électrogène',
  'Balcon',
  'Cuisine équipée',
  'Télévision',
  'Lave-linge',
  'Réfrigérateur',
  'Micro-ondes',
  'Linge de maison',
];

export const AMENITIES_UNFURNISHED = [
  'Parking',
  'Sécurité 24/24',
  'Eau 24/24',
  'Groupe électrogène',
  'Balcon',
  'Ascenseur',
  'Compteur prépayé',
  "Citerne d'eau",
];

export const AMENITIES_SHOP = [
  'Bord de route',
  'Rez-de-chaussée',
  'Vitrine large',
  'Parking clients',
  'Sécurité/Gardiennage',
  'Eau 24/24',
  'Compteur électrique',
  'WC',
];

export const MOCK_PROPERTIES: Record<string, PropertyData> = {
  'villa-1': {
    id: 'villa-1',
    type: 'house',
    isFurnished: false,
    title: 'Villa luxueuse familiale',
    description:
      "Villa spacieuse non meublée située à Akwa. Grand jardin, idéale pour famille. Quartier sécurisé, proche écoles et commerces. La maison dispose d'une dépendance pour le personnel et d'une citerne d'eau indépendante pour garantir le confort quotidien.",
    price: '450000',
    priceType: 'monthly',
    deposit: '900000',
    location: {
      address: '12 Rue des Manguiers',
      neighborhood: 'Akwa',
      city: 'Douala',
      coordinates: { lat: 4.0505, lng: 9.7088 },
    },
    images: [
      'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200',
      'https://images.unsplash.com/photo-1505691723518-36a3f0f9f50d?w=1200',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200',
    ],
    landlord: {
      name: 'Joseph Ewane',
      avatar: 'https://i.pravatar.cc/150?img=12',
      verified: true,
      rating: 4.6,
      reviewsCount: 18,
    },
    bedrooms: 4,
    bathrooms: 3,
    kitchens: 1,
    livingRooms: 2,
    likes: 189,
    views: 2400,
    shares: 150,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237650000001',
    whatsapp: '+237650000001',
  },
  'villa-2': {
    id: 'villa-2',
    type: 'apartment',
    isFurnished: true,
    title: 'Duplex moderne meublé',
    description:
      "Duplex premium entièrement meublé avec services hôteliers. Idéal pour voyages d'affaires prolongés. Chaque niveau possède sa terrasse panoramique et la conciergerie 24/24 peut organiser transferts, pressing et repas à domicile.",
    price: '75000',
    priceType: 'daily',
    location: {
      address: '45 Boulevard de Bordeaux',
      neighborhood: 'Bonapriso',
      city: 'Douala',
      coordinates: { lat: 4.0474, lng: 9.7058 },
    },
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1200',
      'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=1200',
    ],
    landlord: {
      name: 'Marie Kouassi',
      avatar: 'https://i.pravatar.cc/150?img=5',
      verified: true,
      rating: 4.8,
      reviewsCount: 24,
    },
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    likes: 245,
    views: 3200,
    shares: 210,
    availableFrom: '2024-03-01',
    availableUntil: '2024-12-31',
    amenities: AMENITIES_FURNISHED,
    phoneNumber: '+237650000002',
    whatsapp: '+237650000002',
  },
  'villa-3': {
    id: 'villa-3',
    type: 'boutique',
    isFurnished: false,
    title: 'Boutique commerciale vitrée',
    description:
      "Local commercial lumineux en plein Makepe, trafic piéton élevé, idéal pour prêt-à-porter ou showroom. Les vitrines d'angle permettent de mettre en scène vos collections et une réserve fermée facilite la gestion du stock.",
    price: '500000',
    priceType: 'monthly',
    location: {
      address: 'Carrefour Montée Jouvence',
      neighborhood: 'Makepe',
      city: 'Douala',
      coordinates: { lat: 4.076, lng: 9.717 },
    },
    images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
    landlord: {
      name: 'Pauline Mba',
      avatar: 'https://i.pravatar.cc/150?img=34',
      verified: false,
      rating: 4.2,
      reviewsCount: 9,
    },
    surfaceArea: '85',
    likes: 90,
    views: 1200,
    shares: 40,
    amenities: AMENITIES_SHOP,
    phoneNumber: '+237650000003',
    whatsapp: '+237650000003',
  },
  'villa-4': {
    id: 'villa-4',
    type: 'studio',
    isFurnished: true,
    title: 'Studio cosy Bali',
    description:
      "Studio meublé ultra cosy avec kitchenette, idéal pour étudiants ou jeunes actifs. Balcon couvert, climatisation silencieuse et bureau prêt pour le télétravail afin de rester productif sans quitter le centre-ville.",
    price: '30000',
    priceType: 'daily',
    location: {
      address: 'Rue des Flamboyants',
      neighborhood: 'Bali',
      city: 'Douala',
      coordinates: { lat: 4.047, lng: 9.699 },
    },
    images: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200',
    ],
    landlord: {
      name: 'Gaëlle Menye',
      avatar: 'https://i.pravatar.cc/150?img=45',
      verified: true,
      rating: 4.5,
      reviewsCount: 12,
    },
    bathrooms: 1,
    kitchens: 1,
    likes: 88,
    views: 980,
    shares: 34,
    amenities: AMENITIES_FURNISHED.slice(0, 6),
    phoneNumber: '+237650000004',
    whatsapp: '+237650000004',
  },
  'apt-bonapriso-terrasse': {
    id: 'apt-bonapriso-terrasse',
    type: 'apartment',
    isFurnished: true,
    title: 'Appartement terrasse panoramique',
    description:
      "Situé au cœur de Bonapriso, cet appartement de standing propose une vaste terrasse arborée avec vue dégagée, une cuisine ouverte équipée d'appareils premium et une suite parentale avec dressing ventilé. La résidence offre piscine, salle de sport et accueil 24/24.",
    price: '650000',
    priceType: 'monthly',
    deposit: '1300000',
    location: {
      address: 'Rue Tokoto',
      neighborhood: 'Bonapriso',
      city: 'Douala',
      coordinates: { lat: 4.0473, lng: 9.7059 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1495805443179-449bb68e480c?w=1200',
      'https://images.unsplash.com/photo-1505691723518-36a3f0f9f50d?w=1200',
    ],
    landlord: {
      name: 'Estelle Nkeng',
      avatar: 'https://i.pravatar.cc/150?img=21',
      verified: true,
      rating: 4.9,
      reviewsCount: 42,
    },
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    likes: 512,
    views: 7800,
    shares: 320,
    amenities: AMENITIES_FURNISHED,
    phoneNumber: '+237651001001',
    whatsapp: '+237651001001',
  },
  'apartment-bonamoussadi-family': {
    id: 'apartment-bonamoussadi-family',
    type: 'apartment',
    isFurnished: false,
    title: 'Appartement familial Bonamoussadi',
    description:
      "Grand appartement traversant dans une rue calme de Bonamoussadi. Double séjour aéré, cuisine séparée avec cellier et chambres dotées de placards encastrés. L'immeuble dispose d'un groupe électrogène et d'une citerne partagée.",
    price: '230000',
    priceType: 'monthly',
    deposit: '460000',
    location: {
      address: 'Impasse des Hibiscus',
      neighborhood: 'Bonamoussadi',
      city: 'Douala',
      coordinates: { lat: 4.1002, lng: 9.7234 },
    },
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
      'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=1200',
    ],
    landlord: {
      name: 'Lionel Atem',
      avatar: 'https://i.pravatar.cc/150?img=31',
      verified: true,
      rating: 4.4,
      reviewsCount: 21,
    },
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    likes: 178,
    views: 3500,
    shares: 120,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237651001002',
    whatsapp: '+237651001002',
  },
  'apartment-bastos-prestige': {
    id: 'apartment-bastos-prestige',
    type: 'apartment',
    isFurnished: true,
    title: 'Penthouse Bastos Prestige',
    description:
      "Penthouse dernier étage avec baie vitrée plein sud, spa privé et bureau séparé. Les finitions en bois clair et marbre créent une ambiance chic tandis que le service de résidence propose entretien bihebdomadaire et parking sous-terrain sécurisé.",
    price: '950000',
    priceType: 'monthly',
    deposit: '1900000',
    location: {
      address: 'Avenue Rosa Parks',
      neighborhood: 'Bastos',
      city: 'Yaoundé',
      coordinates: { lat: 3.8735, lng: 11.5169 },
    },
    images: [
      'https://images.unsplash.com/photo-1472220625704-91e1462799b2?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1505691723518-36a3f0f9f50d?w=1200',
    ],
    landlord: {
      name: 'Nadine Essomba',
      avatar: 'https://i.pravatar.cc/150?img=18',
      verified: true,
      rating: 4.9,
      reviewsCount: 37,
    },
    bedrooms: 4,
    bathrooms: 3,
    kitchens: 1,
    livingRooms: 2,
    likes: 602,
    views: 9200,
    shares: 410,
    amenities: AMENITIES_FURNISHED,
    phoneNumber: '+237651001003',
    whatsapp: '+237651001003',
  },
  'house-logpom-panorama': {
    id: 'house-logpom-panorama',
    type: 'house',
    isFurnished: false,
    title: 'Maison contemporaine Logpom',
    description:
      "Maison récente construite sur trois niveaux avec rooftop aménageable. Jardin arrière prêt à accueillir une piscine ou un potager, garage double automatisé et studio gardien indépendant.",
    price: '780000',
    priceType: 'monthly',
    deposit: '1560000',
    location: {
      address: 'Rue des Mimosas',
      neighborhood: 'Logpom',
      city: 'Douala',
      coordinates: { lat: 4.0714, lng: 9.731 },
    },
    images: [
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=1200',
    ],
    landlord: {
      name: 'Armand Fomen',
      avatar: 'https://i.pravatar.cc/150?img=36',
      verified: true,
      rating: 4.7,
      reviewsCount: 28,
    },
    bedrooms: 5,
    bathrooms: 4,
    kitchens: 1,
    livingRooms: 2,
    likes: 265,
    views: 5100,
    shares: 180,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237651001004',
    whatsapp: '+237651001004',
  },
  'house-kribi-plage': {
    id: 'house-kribi-plage',
    type: 'house',
    isFurnished: true,
    title: 'Maison plage privée Kribi',
    description:
      "Villa balnéaire entièrement meublée sur la plage de Mpalla. Trois suites avec vue mer, cuisine extérieure pour barbecue, kayaks à disposition et chef local en option.",
    price: '120000',
    priceType: 'daily',
    deposit: '200000',
    location: {
      address: 'Route de Mpalla',
      neighborhood: 'Mpalla',
      city: 'Kribi',
      coordinates: { lat: 2.9395, lng: 9.9101 },
    },
    images: [
      'https://images.unsplash.com/photo-1501117716987-c8e1ecb210cc?w=1200',
      'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    ],
    landlord: {
      name: 'Rosine Ngalle',
      avatar: 'https://i.pravatar.cc/150?img=27',
      verified: true,
      rating: 4.8,
      reviewsCount: 45,
    },
    bedrooms: 4,
    bathrooms: 4,
    kitchens: 2,
    livingRooms: 2,
    likes: 410,
    views: 6900,
    shares: 260,
    amenities: AMENITIES_FURNISHED,
    phoneNumber: '+237651001005',
    whatsapp: '+237651001005',
  },
  'villa-golf-noria': {
    id: 'villa-golf-noria',
    type: 'villa',
    isFurnished: false,
    title: 'Villa Golf Noria',
    description:
      "Villa prestige de 600 m² au quartier Golf à Yaoundé. Vaste séjour cathédrale, patio central, chambres avec salles d'eau privatives et sous-sol aménageable. Parcelle arborée avec court multi-sports et parking couvert.",
    price: '1100000',
    priceType: 'monthly',
    deposit: '2200000',
    location: {
      address: 'Rue du Golf',
      neighborhood: 'Golf',
      city: 'Yaoundé',
      coordinates: { lat: 3.8561, lng: 11.5207 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=1200',
      'https://images.unsplash.com/photo-1505692794403-34d4982ef4d1?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
    landlord: {
      name: 'Patrick Etoga',
      avatar: 'https://i.pravatar.cc/150?img=7',
      verified: true,
      rating: 4.9,
      reviewsCount: 33,
    },
    bedrooms: 5,
    bathrooms: 5,
    kitchens: 2,
    livingRooms: 3,
    likes: 550,
    views: 8400,
    shares: 300,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237651001006',
    whatsapp: '+237651001006',
  },
  'studio-odza-creative': {
    id: 'studio-odza-creative',
    type: 'studio',
    isFurnished: true,
    title: 'Studio créatif Odza',
    description:
      "Petit studio lumineux avec verrière intérieure, idéal pour jeunes créatifs ou expatriés en mission. Coin lecture, lit escamotable pour optimiser l'espace et balcon donnant sur une cour arborée.",
    price: '22000',
    priceType: 'daily',
    location: {
      address: 'Rue du Lycée Bilingue',
      neighborhood: 'Odza',
      city: 'Yaoundé',
      coordinates: { lat: 3.813, lng: 11.5237 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1487014679447-9f8336841d58?w=1200',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200',
    ],
    landlord: {
      name: 'Prisca Nguetta',
      avatar: 'https://i.pravatar.cc/150?img=48',
      verified: false,
      rating: 4.3,
      reviewsCount: 14,
    },
    bathrooms: 1,
    kitchens: 1,
    likes: 132,
    views: 2100,
    shares: 60,
    amenities: AMENITIES_FURNISHED.slice(0, 7),
    phoneNumber: '+237651001007',
    whatsapp: '+237651001007',
  },
  'studio-bonapriso-rooftop': {
    id: 'studio-bonapriso-rooftop',
    type: 'studio',
    isFurnished: true,
    title: 'Studio rooftop & skylight',
    description:
      "Loft compact avec verrière ouvrante donnant accès direct au rooftop partagé. Coin nuit séparé par une bibliothèque, cuisine équipée et douche à l'italienne.",
    price: '40000',
    priceType: 'daily',
    location: {
      address: 'Rue des Citronniers',
      neighborhood: 'Bonapriso',
      city: 'Douala',
      coordinates: { lat: 4.0476, lng: 9.7061 },
    },
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
    ],
    landlord: {
      name: 'Steve Biloa',
      avatar: 'https://i.pravatar.cc/150?img=2',
      verified: true,
      rating: 4.6,
      reviewsCount: 19,
    },
    bathrooms: 1,
    kitchens: 1,
    likes: 210,
    views: 3300,
    shares: 110,
    amenities: AMENITIES_FURNISHED.slice(0, 8),
    phoneNumber: '+237651001008',
    whatsapp: '+237651001008',
  },
  'chambre-deido-balcon': {
    id: 'chambre-deido-balcon',
    type: 'chambre',
    isFurnished: true,
    title: 'Chambre balcon Deido',
    description:
      "Chambre meublée avec balcon privatif, armoire double et salle d'eau moderne. Loyer comprenant l'eau et l'électricité, idéal pour jeunes actifs travaillant au port ou au centre-ville.",
    price: '95000',
    priceType: 'monthly',
    deposit: '190000',
    location: {
      address: 'Rue des Cocotiers',
      neighborhood: 'Deido',
      city: 'Douala',
      coordinates: { lat: 4.0591, lng: 9.7105 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
    ],
    landlord: {
      name: 'Clarisse Ewodo',
      avatar: 'https://i.pravatar.cc/150?img=15',
      verified: false,
      rating: 4.2,
      reviewsCount: 11,
    },
    bedrooms: 1,
    bathrooms: 1,
    likes: 96,
    views: 1800,
    shares: 55,
    amenities: ['Wifi', 'Eau 24/24', 'Balcon', 'Climatisation'],
    phoneNumber: '+237651001009',
    whatsapp: '+237651001009',
  },
  'chambre-melen-serenite': {
    id: 'chambre-melen-serenite',
    type: 'chambre',
    isFurnished: false,
    title: 'Chambre simple Melen',
    description:
      "Chambre indépendante dans une concession soignée à Melen. Accès cuisine commune, douche carrelée et compteur prépayé individuel. Quartier étudiant très desservi par les transports.",
    price: '65000',
    priceType: 'monthly',
    deposit: '130000',
    location: {
      address: 'Rue Campus 2',
      neighborhood: 'Melen',
      city: 'Yaoundé',
      coordinates: { lat: 3.879, lng: 11.5065 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691723518-36a3f0f9f50d?w=1200',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
    ],
    landlord: {
      name: 'Monsieur Abessolo',
      avatar: 'https://i.pravatar.cc/150?img=52',
      verified: false,
      rating: 4.0,
      reviewsCount: 7,
    },
    bedrooms: 1,
    bathrooms: 1,
    likes: 84,
    views: 1300,
    shares: 30,
    amenities: ['Compteur prépayé', 'Eau 24/24'],
    phoneNumber: '+237651001010',
    whatsapp: '+237651001010',
  },
  'boutique-bonamoussadi-arcade': {
    id: 'boutique-bonamoussadi-arcade',
    type: 'boutique',
    isFurnished: false,
    title: 'Arcade commerciale Bonamoussadi',
    description:
      "Boutique de 60 m² en bord de route avec vitrine alu et rideaux métalliques. Parking client partagé et compteur prépayé indépendant.",
    price: '350000',
    priceType: 'monthly',
    location: {
      address: 'Boulevard de la Liberté',
      neighborhood: 'Bonamoussadi',
      city: 'Douala',
      coordinates: { lat: 4.102, lng: 9.7205 },
    },
    images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
    landlord: {
      name: 'Brice Ngadeu',
      avatar: 'https://i.pravatar.cc/150?img=40',
      verified: false,
      rating: 4.1,
      reviewsCount: 8,
    },
    surfaceArea: '60',
    likes: 70,
    views: 980,
    shares: 24,
    amenities: AMENITIES_SHOP,
    phoneNumber: '+237651001011',
    whatsapp: '+237651001011',
  },
  'boutique-bastos-showroom': {
    id: 'boutique-bastos-showroom',
    type: 'boutique',
    isFurnished: false,
    title: 'Showroom Bastos',
    description:
      "Showroom premium au rez-de-chaussée d'un immeuble haut standing à Bastos. Idéal pour galerie d'art ou mobilier design avec stationnement visiteurs et système de climatisation central.",
    price: '700000',
    priceType: 'monthly',
    location: {
      address: 'Rue Foé',
      neighborhood: 'Bastos',
      city: 'Yaoundé',
      coordinates: { lat: 3.872, lng: 11.516 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
    ],
    landlord: {
      name: 'Maison Ndedi',
      avatar: 'https://i.pravatar.cc/150?img=50',
      verified: true,
      rating: 4.5,
      reviewsCount: 16,
    },
    surfaceArea: '95',
    likes: 112,
    views: 1700,
    shares: 58,
    amenities: AMENITIES_SHOP,
    phoneNumber: '+237651001012',
    whatsapp: '+237651001012',
  },
  'house-bepanda-duplex': {
    id: 'house-bepanda-duplex',
    type: 'house',
    isFurnished: false,
    title: 'Duplex moderne Bepanda',
    description:
      "Duplex fraîchement rénové avec grande terrasse arrière, cuisine américaine et parking couvert. À proximité immédiate des commerces et du stade.",
    price: '320000',
    priceType: 'monthly',
    deposit: '640000',
    location: {
      address: 'Rue du Stade',
      neighborhood: 'Bepanda',
      city: 'Douala',
      coordinates: { lat: 4.078, lng: 9.702 },
    },
    images: [
      'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
    landlord: {
      name: 'Didier Moukouri',
      avatar: 'https://i.pravatar.cc/150?img=13',
      verified: false,
      rating: 4.3,
      reviewsCount: 13,
    },
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    likes: 142,
    views: 2600,
    shares: 88,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237651001013',
    whatsapp: '+237651001013',
  },
  'apartment-citeverte-garden': {
    id: 'apartment-citeverte-garden',
    type: 'apartment',
    isFurnished: false,
    title: 'Appartement Cité-Verte jardin',
    description:
      "Appartement rez-de-jardin dans une copropriété verdoyante. Salon lumineux ouvrant sur terrasse, cuisine fermée et chambres climatisées. À 5 minutes du marché d'Essos.",
    price: '280000',
    priceType: 'monthly',
    deposit: '560000',
    location: {
      address: 'Rue des Colibris',
      neighborhood: 'Cité-Verte',
      city: 'Yaoundé',
      coordinates: { lat: 3.8725, lng: 11.4862 },
    },
    images: [
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
    landlord: {
      name: 'Maureen Talla',
      avatar: 'https://i.pravatar.cc/150?img=25',
      verified: true,
      rating: 4.5,
      reviewsCount: 19,
    },
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    likes: 188,
    views: 3100,
    shares: 102,
    amenities: AMENITIES_UNFURNISHED,
    phoneNumber: '+237651001014',
    whatsapp: '+237651001014',
  },
  'maison-santa-barbara': {
    id: 'maison-santa-barbara',
    type: 'house',
    isFurnished: true,
    title: 'Maison Santa Barbara meublée',
    description:
      "Belle maison meublée à Santa Barbara (Yaoundé) avec patio central, salon cathédrale, trois suites et un bureau vitré donnant sur le jardin tropical.",
    price: '550000',
    priceType: 'monthly',
    deposit: '1100000',
    location: {
      address: 'Impasse des Palmiers',
      neighborhood: 'Santa Barbara',
      city: 'Yaoundé',
      coordinates: { lat: 3.893, lng: 11.5202 },
    },
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
      'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1200',
      'https://images.unsplash.com/photo-1505691723518-36a3f0f9f50d?w=1200',
    ],
    landlord: {
      name: 'Valérie Ngono',
      avatar: 'https://i.pravatar.cc/150?img=16',
      verified: true,
      rating: 4.7,
      reviewsCount: 25,
    },
    bedrooms: 4,
    bathrooms: 3,
    kitchens: 1,
    livingRooms: 2,
    likes: 230,
    views: 4200,
    shares: 150,
    amenities: AMENITIES_FURNISHED,
    phoneNumber: '+237651001015',
    whatsapp: '+237651001015',
  },
};

export const PROPERTY_LIST = Object.values(MOCK_PROPERTIES);

export const getAllProperties = (): PropertyData[] => PROPERTY_LIST;

export const getPropertyById = (id: string): PropertyData | undefined => MOCK_PROPERTIES[id];

export const getDefaultProperty = (): PropertyData => MOCK_PROPERTIES['villa-2'];

export const openPhone = (phoneNumber?: string) => {
  if (!phoneNumber) return;
  Linking.openURL(`tel:${phoneNumber}`);
};

export const openWhatsApp = (phoneNumber?: string, message?: string) => {
  if (!phoneNumber) return;
  const phone = phoneNumber.replace(/[^0-9]/g, '');
  const text = encodeURIComponent(message ?? "Bonjour, je suis intéressé(e) par votre annonce sur PUOL.");
  Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`);
};
