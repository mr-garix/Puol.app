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

type CreateSupportThreadInput = {
  subject: string;
  message: string;
  topic?: string;
};

const formatSupportTimestamp = (date: Date): string =>
  date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

let supportThreads: SupportThread[] = [];
let hasUnreadReply = false;
const threadListeners = new Set<(threads: SupportThread[]) => void>();
const unreadListeners = new Set<(flag: boolean) => void>();
const replyListeners = new Set<(thread: SupportThread) => void>();
const threadMessages: Record<string, SupportMessage[]> = {};

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
  supportThreads = supportThreads.map((thread) => {
    if (thread.id !== threadId) {
      return thread;
    }

    const isSupportReply = message.sender === 'support';
    return {
      ...thread,
      lastResponse: isSupportReply ? 'Support PUOL' : 'Vous',
      excerpt: message.content,
      timestamp: message.timestamp,
      isNew: isSupportReply ? true : thread.isNew,
    };
  });

  emitThreads();

  if (message.sender === 'support') {
    hasUnreadReply = true;
    emitUnread();
    const updated = supportThreads.find((thread) => thread.id === threadId);
    if (updated) {
      emitReply(updated);
    }
  }
};

export const createSupportThread = ({ subject, message, topic }: CreateSupportThreadInput): SupportThread => {
  const now = new Date();
  const timestamp = formatSupportTimestamp(now);
  const id = `support-${now.getTime()}`;

  const normalizedSubject = subject.trim() || 'Demande support';
  const normalizedMessage = message.trim();

  const thread: SupportThread = {
    id,
    title: normalizedSubject,
    lastResponse: 'Vous',
    excerpt: normalizedMessage || 'Nouveau ticket support',
    status: 'Ouvert',
    timestamp,
    isNew: false,
  };

  supportThreads = [...supportThreads, thread];
  threadMessages[id] = [
    {
      id: `${id}-msg-${now.getTime()}`,
      sender: 'user',
      content: normalizedMessage,
      timestamp,
    },
  ];

  emitThreads();

  return thread;
};
