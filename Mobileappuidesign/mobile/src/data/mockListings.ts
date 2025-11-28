export interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  furnished: boolean;
  pricePerNight?: number;
  pricePerMonth?: number;
  images: string[];
  amenities: string[];
  host: {
    name: string;
    rating: number;
    reviews: number;
  };
  description: string;
  likes: number;
  comments: number;
  shares: number;
}

// Version mobile : reprise d’un sous-ensemble des annonces web
export const mockListings: Listing[] = [
  {
    id: '1',
    title: 'Appartement moderne',
    location: 'Bonamoussadi',
    city: 'Douala',
    type: 'Appartement',
    bedrooms: 2,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    furnished: true,
    pricePerNight: 25000,
    images: [
      'https://images.unsplash.com/photo-1658893136904-63914a6b372c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['WiFi', 'Climatisation', 'Eau courante', "Électricité stable"],
    host: {
      name: 'Marie Nguemba',
      rating: 4.86,
      reviews: 14,
    },
    description:
      'Magnifique appartement moderne situé dans le quartier calme de Bonamoussadi.',
    likes: 342,
    comments: 28,
    shares: 15,
  },
  {
    id: '2',
    title: 'Studio chic',
    location: 'Makepe BM',
    city: 'Douala',
    type: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    kitchens: 1,
    livingRooms: 1,
    furnished: true,
    pricePerNight: 15000,
    images: [
      'https://images.unsplash.com/photo-1702014862053-946a122b920d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1703782498522-f9c2b9c1bc25?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['WiFi', 'Climatisation', 'Parking'],
    host: {
      name: 'Jean Kamga',
      rating: 4.92,
      reviews: 22,
    },
    description: 'Studio parfait pour voyageur solo ou couple, tout équipé.',
    likes: 567,
    comments: 45,
    shares: 23,
  },
  {
    id: '3',
    title: 'Villa luxueuse',
    location: 'Akwa',
    city: 'Douala',
    type: 'Villa',
    bedrooms: 4,
    bathrooms: 3,
    kitchens: 1,
    livingRooms: 2,
    furnished: false,
    pricePerMonth: 450000,
    images: [
      'https://images.unsplash.com/photo-1679364297777-1db77b6199be?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1630699144919-681cf308ae82?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['Parking', 'Jardin', 'Sécurité 24/7', 'Générateur'],
    host: {
      name: 'Paul Ebogo',
      rating: 4.75,
      reviews: 8,
    },
    description: 'Grande villa non meublée dans le quartier prestigieux d\'Akwa.',
    likes: 189,
    comments: 12,
    shares: 7,
  },
  {
    id: '4',
    title: 'Appartement confortable',
    location: 'Bali',
    city: 'Douala',
    type: 'Appartement',
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    livingRooms: 1,
    furnished: true,
    pricePerNight: 20000,
    images: [
      'https://images.unsplash.com/photo-1625579002297-aeebbf69de89?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1610177534644-34d881503b83?auto=format&fit=crop&w=1200&q=80',
    ],
    amenities: ['WiFi', 'Climatisation', 'Eau courante', 'Parking'],
    host: {
      name: 'Alice Moundipa',
      rating: 4.88,
      reviews: 19,
    },
    description: 'Bel appartement meublé avec goût, dans un cadre calme à Bali.',
    likes: 423,
    comments: 34,
    shares: 18,
  },
];
