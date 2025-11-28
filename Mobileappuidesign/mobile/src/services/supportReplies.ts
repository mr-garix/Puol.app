export type SupportThread = {
  id: string;
  title: string;
  lastResponse: string;
  excerpt: string;
  status: string;
  timestamp: string;
  isNew?: boolean;
};

export type SupportMessage = {
  id: string;
  sender: 'user' | 'support';
  content: string;
  timestamp: string;
};

const MOCK_SUPPORT_THREADS: SupportThread[] = [
  {
    id: 'support-1',
    title: 'Suivi de réservation #4582',
    lastResponse: 'Nadine (Support PUOL)',
    excerpt: 'Nous venons de mettre à jour votre réservation...',
    status: 'Résolu',
    timestamp: 'Hier · 18:42',
  },
  {
    id: 'support-2',
    title: 'Bug lors du paiement',
    lastResponse: 'Karl (Support PUOL)',
    excerpt: 'Merci pour le signalement, le correctif est déployé.',
    status: 'En cours',
    timestamp: '23 nov. · 10:12',
  },
];

let supportThreads: SupportThread[] = [...MOCK_SUPPORT_THREADS];
let hasUnreadReply = false;
const threadListeners = new Set<(threads: SupportThread[]) => void>();
const unreadListeners = new Set<(flag: boolean) => void>();
const replyListeners = new Set<(thread: SupportThread) => void>();
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

const threadMessages: Record<string, SupportMessage[]> = {
  'support-1': [
    {
      id: 'support-1-msg-1',
      sender: 'user',
      content: 'Bonjour, je voulais confirmer la visite de demain.',
      timestamp: 'Hier · 09:52',
    },
    {
      id: 'support-1-msg-2',
      sender: 'support',
      content: 'Bonjour ! Oui, la visite reste confirmée pour demain 15h.',
      timestamp: 'Hier · 10:05',
    },
  ],
  'support-2': [
    {
      id: 'support-2-msg-1',
      sender: 'user',
      content: 'Bonjour, mon paiement ne passe plus sur l’annonce Golf.',
      timestamp: '23 nov. · 09:55',
    },
    {
      id: 'support-2-msg-2',
      sender: 'support',
      content: 'Merci pour le signalement ! Nous vérifions et revenons vers vous.',
      timestamp: '23 nov. · 10:12',
    },
  ],
};

const emitThreads = () => {
  const snapshot = [...supportThreads];
  threadListeners.forEach((listener) => listener(snapshot));
};

const emitUnread = () => {
  unreadListeners.forEach((listener) => listener(hasUnreadReply));
};

const emitReply = (thread: SupportThread) => {
  replyListeners.forEach((listener) => listener(thread));
};

const appendThread = (thread: SupportThread) => {
  supportThreads = [...supportThreads, thread];
  hasUnreadReply = true;
  emitThreads();
  emitUnread();
  emitReply(thread);
};

export const getSupportThreads = () => [...supportThreads];

export const subscribeToSupportThreads = (listener: (threads: SupportThread[]) => void) => {
  threadListeners.add(listener);
  return () => threadListeners.delete(listener);
};

export const getSupportUnreadFlag = () => hasUnreadReply;

export const subscribeToSupportUnreadFlag = (listener: (flag: boolean) => void) => {
  unreadListeners.add(listener);
  return () => unreadListeners.delete(listener);
};

export const subscribeToNewSupportReplies = (listener: (thread: SupportThread) => void) => {
  replyListeners.add(listener);
  return () => replyListeners.delete(listener);
};

export const markSupportRepliesRead = () => {
  if (!hasUnreadReply) {
    return;
  }
  supportThreads = supportThreads.map((thread) => ({
    ...thread,
    isNew: thread.isNew ? false : thread.isNew,
  }));
  hasUnreadReply = false;
  emitThreads();
  emitUnread();
};

export const getSupportThreadById = (threadId: string) =>
  supportThreads.find((thread) => thread.id === threadId);

export const getSupportThreadMessages = (threadId: string): SupportMessage[] =>
  threadMessages[threadId] ? [...threadMessages[threadId]] : [];

export const appendSupportThreadMessage = (threadId: string, message: SupportMessage) => {
  const existing = threadMessages[threadId] ?? [];
  threadMessages[threadId] = [...existing, message];
};

const generateSimulatedThread = (): SupportThread => ({
  id: `support-${Date.now()}`,
  title: `Réponse PUOL • Ticket #${Math.floor(Math.random() * 9000 + 1000)}`,
  lastResponse: 'Support PUOL',
  excerpt: "Bonjour, nous avons bien reçu votre demande et venons de la traiter. N’hésitez pas à répondre.",
  status: 'En cours',
  timestamp: new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }),
  isNew: true,
});

export const scheduleSimulatedSupportReply = (delayMs: number) => {
  if (pendingTimeout) {
    clearTimeout(pendingTimeout);
  }

  pendingTimeout = setTimeout(() => {
    const thread = generateSimulatedThread();
    appendThread(thread);
    threadMessages[thread.id] = [
      {
        id: `${thread.id}-msg-1`,
        sender: 'user',
        content: 'Bonjour, je souhaite obtenir une mise à jour sur mon ticket.',
        timestamp: thread.timestamp,
      },
      {
        id: `${thread.id}-msg-2`,
        sender: 'support',
        content: "Merci pour votre patience, nous venons d'apporter la correction demandée.",
        timestamp: thread.timestamp,
      },
    ];
    pendingTimeout = null;
  }, delayMs);
};
