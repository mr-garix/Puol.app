export type Conversation = {
  id: string;
  name: string;
  subtitle: string;
  avatar: string;
  lastMessage: string;
  unread: number;
  propertyTag: string;
  propertyId: string;
};

export type Message = {
  id: string;
  sender: 'user' | 'host';
  content: string;
  timestamp: string;
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    name: 'Studio cosy Bonapriso',
    subtitle: 'Bailleur · Serge Bekolo',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop',
    lastMessage: 'Bonjour, la visite reste confirmée pour demain 15h ✔️',
    unread: 2,
    propertyTag: 'Studio · Bonapriso',
    propertyId: 'property-101',
  },
  {
    id: 'conv-2',
    name: 'Duplex Golf Yaoundé',
    subtitle: 'Bailleur · Hermine T.',
    avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&auto=format&fit=crop',
    lastMessage: 'Merci pour votre intérêt, je vous envoie la localisation.',
    unread: 0,
    propertyTag: 'Duplex · Golf',
    propertyId: 'property-205',
  },
  {
    id: 'conv-3',
    name: 'Loft Akwa business',
    subtitle: 'Bailleur · Clément A.',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop',
    lastMessage: 'Parfait, nous vous attendons samedi matin.',
    unread: 1,
    propertyTag: 'Loft · Akwa',
    propertyId: 'property-309',
  },
];

export const THREAD_BY_CONVERSATION: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      sender: 'host',
      content: 'Bonjour Marie, heureux de vous accueillir vendredi pour la visite.',
      timestamp: '09:42',
    },
    {
      id: 'msg-2',
      sender: 'user',
      content: 'Bonjour Serge ! Merci, je serai là à 15h comme convenu.',
      timestamp: '09:44',
    },
    {
      id: 'msg-3',
      sender: 'host',
      content: "Parfait, l'adresse exacte est Rue Njo-Njo, immeuble vert. À très vite !",
      timestamp: '09:45',
    },
  ],
  'conv-2': [
    {
      id: 'msg-1',
      sender: 'host',
      content: 'Bonjour Marie, merci pour votre intérêt, je vous envoie la localisation.',
      timestamp: '12:15',
    },
    {
      id: 'msg-2',
      sender: 'user',
      content: 'Merci beaucoup ! Est-ce possible de visiter dimanche ?',
      timestamp: '12:18',
    },
  ],
  'conv-3': [
    {
      id: 'msg-1',
      sender: 'host',
      content: 'Bonjour, la visite est confirmée samedi à 10h.',
      timestamp: '08:02',
    },
    {
      id: 'msg-2',
      sender: 'user',
      content: "Super, je serai présente avec un proche pour la visite.",
      timestamp: '08:05',
    },
  ],
};
