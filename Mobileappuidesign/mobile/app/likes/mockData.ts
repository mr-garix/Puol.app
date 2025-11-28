export type LikeActivity = {
  id: string;
  userName: string;
  userHandle: string;
  avatar: string;
  contentTitle: string;
  contentThumbnail: string;
  timeAgo: string;
  groupLabel: string;
  burstCount: number;
  contentDuration: string;
  contentDescription: string;
  propertyId: string;
};

export const LIKE_ACTIVITIES: LikeActivity[] = [
  {
    id: 'like-1',
    userName: 'Nina Fokou',
    userHandle: '@ninaf',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&auto=format&fit=crop',
    contentTitle: 'Studio cosy Bonapriso',
    contentThumbnail: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Il y a 2 min',
    groupLabel: "Aujourd'hui",
    burstCount: 1,
    contentDuration: '1:12',
    contentDescription: 'Visite express du studio Bonapriso avec focus sur la lumière naturelle et le coin nuit.',
    propertyId: 'property-101',
  },
  {
    id: 'like-2',
    userName: 'Serges N.',
    userHandle: '@sergesn',
    avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&auto=format&fit=crop',
    contentTitle: 'Duplex Golf Yaoundé',
    contentThumbnail: 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Il y a 8 min',
    groupLabel: "Aujourd'hui",
    burstCount: 3,
    contentDuration: '2:06',
    contentDescription: 'Drone shot + walkthrough du duplex premium situé au Golf, Yaoundé.',
    propertyId: 'property-205',
  },
  {
    id: 'like-3',
    userName: 'Leslie Mova',
    userHandle: '@lesliem',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
    contentTitle: 'Loft Akwa business',
    contentThumbnail: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Il y a 32 min',
    groupLabel: "Aujourd'hui",
    burstCount: 1,
    contentDuration: '0:58',
    contentDescription: 'Présentation du loft business-friendly situé à Akwa avec rooftop.',
    propertyId: 'property-309',
  },
  {
    id: 'like-4',
    userName: 'Collectif PUOL',
    userHandle: '@collectif',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop',
    contentTitle: 'Studio cosy Bonapriso',
    contentThumbnail: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Hier · 19:24',
    groupLabel: 'Hier',
    burstCount: 5,
    contentDuration: '1:45',
    contentDescription: 'Compilation des meilleurs angles du studio cosy, idéale pour reels.',
    propertyId: 'property-101',
  },
  {
    id: 'like-5',
    userName: 'Estelle D.',
    userHandle: '@estelled',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop',
    contentTitle: 'Mini loft Makepe',
    contentThumbnail: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Hier · 16:02',
    groupLabel: 'Hier',
    burstCount: 1,
    contentDuration: '1:03',
    contentDescription: 'Mini loft chaleureux avec mezzanine, parfait pour jeunes actifs.',
    propertyId: 'property-410',
  },
];
