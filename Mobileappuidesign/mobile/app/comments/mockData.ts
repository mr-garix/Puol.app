export type CommentActivity = {
  id: string;
  userName: string;
  userHandle: string;
  avatar: string;
  commentText: string;
  contentTitle: string;
  contentThumbnail: string;
  timeAgo: string;
  groupLabel: string;
  propertyId: string;
};

export const COMMENT_ACTIVITIES: CommentActivity[] = [
  {
    id: 'comment-1',
    userName: 'Nadia K. ',
    userHandle: '@nadk',
    avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop',
    commentText: 'Superbe vidéo ! Est-ce que la cuisine est entièrement équipée ?',
    contentTitle: 'Studio cosy Bonapriso',
    contentThumbnail: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Il y a 5 min',
    groupLabel: "Aujourd'hui",
    propertyId: 'property-101',
  },
  {
    id: 'comment-2',
    userName: 'Brice M.',
    userHandle: '@bricem',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop',
    commentText: 'On peut planifier une visite virtuelle du duplex ?',
    contentTitle: 'Duplex Golf Yaoundé',
    contentThumbnail: 'https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Il y a 18 min',
    groupLabel: "Aujourd'hui",
    propertyId: 'property-205',
  },
  {
    id: 'comment-3',
    userName: 'Collectif PUOL',
    userHandle: '@collectif',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&auto=format&fit=crop',
    commentText: 'Merci pour la vidéo, est-ce que le rooftop est accessible aux invités ?',
    contentTitle: 'Loft Akwa business',
    contentThumbnail: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Hier · 21:10',
    groupLabel: 'Hier',
    propertyId: 'property-309',
  },
  {
    id: 'comment-4',
    userName: 'Estelle D.',
    userHandle: '@estelled',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&auto=format&fit=crop',
    commentText: "J'adore ! Le mini loft est-il encore disponible pour décembre ?",
    contentTitle: 'Mini loft Makepe',
    contentThumbnail: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80',
    timeAgo: 'Hier · 16:48',
    groupLabel: 'Hier',
    propertyId: 'property-410',
  },
];
