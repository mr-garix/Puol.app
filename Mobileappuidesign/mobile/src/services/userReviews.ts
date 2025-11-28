export type UserReview = {
  id: string;
  listingTitle: string;
  listingLocation: string;
  listingCover: string;
  rating: number;
  createdAt: string;
  content: string;
  propertyId: string;
};

export const MOCK_USER_REVIEWS: UserReview[] = [
  {
    id: 'review-1',
    listingTitle: 'Loft Akwa Business',
    listingLocation: 'Douala · Akwa',
    listingCover: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&auto=format&fit=crop',
    rating: 5,
    createdAt: '12 novembre 2025',
    content: 'Séjour incroyable, hôte très réactif et loft encore plus beau que sur les photos.',
    propertyId: 'property-309',
  },
  {
    id: 'review-2',
    listingTitle: 'Studio Cosy Bonapriso',
    listingLocation: 'Douala · Bonapriso',
    listingCover: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?w=800&auto=format&fit=crop',
    rating: 4,
    createdAt: '4 novembre 2025',
    content: "Très bon emplacement et wifi rapide. J'aurais aimé un peu plus de vaisselle.",
    propertyId: 'property-101',
  },
  {
    id: 'review-3',
    listingTitle: 'Duplex Golf Yaoundé',
    listingLocation: 'Yaoundé · Golf',
    listingCover: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop',
    rating: 5,
    createdAt: '28 octobre 2025',
    content: 'Les équipes PUOL ont été top. Je recommande ce duplex pour les séjours pro.',
    propertyId: 'property-205',
  },
];

export const getUserReviews = () => [...MOCK_USER_REVIEWS];
