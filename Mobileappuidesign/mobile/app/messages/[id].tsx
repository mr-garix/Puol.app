import React, { useMemo, useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/src/contexts/AuthContext';
import { Avatar } from '@/src/components/ui/Avatar';
import { useConversationThread } from '@/src/features/messaging/hooks/useConversationThread';
import type { ListedMessage } from '@/src/features/messaging/types';
import { useOptionalVisits } from '@/src/contexts/VisitsContext';
import { VisitScheduleModal } from '@/src/features/visits/components/VisitScheduleModal';
import { PaymentModal } from '@/src/features/payments/components/PaymentModal';

const PUOL_GREEN = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const CHAT_VISIT_PRICE_FCFA = 5000;
const MAX_FILE_SIZE_MB = 12;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const normalizeText = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const detectVisitIntentFromContent = (content?: string | null): boolean => {
  const text = normalizeText(content);
  if (!text) return false;

  const visitKeywords = [
    'visite',
    'visiter',
    'visit',
    'rendez vous',
    'rdv',
    'rendez-vous',
    'programme',
    'programmer',
    'planifie',
    'planifier',
    'planification',
    'creneau',
    'créneau',
    'horaire',
    'heure',
    'date',
  ];

  const intentPhrases = [
    'je souhaite visiter',
    'je voudrais visiter',
    'jaimerais visiter',
    'j aimerais visiter',
    'peux tu programmer',
    'peux tu planifier',
    'on peut planifier une visite',
    'programmer une visite',
    'planifier une visite',
    'prendre un rendez vous',
    'prendre un rdv',
    'bloquer un creneau',
    'bloquer un créneau',
    'quel jour te convient',
    'quelle heure te convient',
    'quand souhaites tu visiter',
    'quand souhaites-tu visiter',
    'quand souhaitez vous visiter',
    'quand souhaitez-vous visiter',
    'quelle date souhaitez vous',
    'quelle date souhaitez-vous',
    'choisis une date',
    'choisis un horaire',
    'fixer une visite',
    'bloquer la visite',
  ];

  const timeRegex = /\b(\d{1,2}\s*h(\s*\d{2})?)\b/; // ex: 18h, 18 h 30
  const dayRegex = /\b(demain|apres demain|après demain|aujourdhui|aujourd hui|semaine prochaine|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/;

  const mentionsVisit = visitKeywords.some((keyword) => text.includes(keyword));
  const mentionsDateOrTime =
    timeRegex.test(text) ||
    dayRegex.test(text) ||
    text.includes('quelle heure') ||
    text.includes('quel jour') ||
    text.includes('quelle date') ||
    text.includes('a quelle heure') ||
    text.includes('a quelle date') ||
    text.includes('a quel jour');

  // On considère l'intention visite seulement si le message mentionne explicitement la visite
  // (ou une phrase type), pas uniquement une date/heure générique.
  return intentPhrases.some((phrase) => text.includes(phrase)) || mentionsVisit;
};

const detectVisitScheduleQuestionFromContent = (content?: string | null): boolean => {
  const text = normalizeText(content);
  if (!text) return false;

  const questionPhrases = [
    'quel jour',
    'quelle jour',
    'quel date',
    'quelle date',
    'a quel jour',
    'a quelle date',
    'quelle heure',
    'quel heure',
    'a quelle heure',
    'quel horaire',
    'quelle horaire',
    'quel creneau',
    'quel créneau',
    'quel horaire te convient',
    'quel horaire vous convient',
    'quand souhaites tu',
    'quand souhaites-tu',
    'quand souhaitez vous',
    'quand souhaitez-vous',
  ];

  return questionPhrases.some((phrase) => text.includes(phrase));
};

export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { supabaseProfile, isLoggedIn } = useAuth();
  const viewerProfileId = supabaseProfile?.id ?? null;
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const {
    conversation,
    messages,
    isLoading,
    isSending,
    isRefreshing,
    error,
    refreshMessages,
    sendMessage,
    softDeleteMessage,
  } = useConversationThread({ conversationId: id, viewerProfileId });

  const viewerRole: 'guest' | 'host' | 'unknown' = conversation?.viewerRole ?? 'unknown';
  const senderProfileId = viewerProfileId ?? '';
  const senderRole = viewerRole === 'host' ? 'host' : 'guest';
  const listingId = conversation?.listingId ?? conversation?.listing?.id ?? null;

  const hostDisplayName = useMemo(() => {
    if (!conversation?.host) {
      return 'Hôte PUOL';
    }
    const tokens = [conversation.host.firstName, conversation.host.lastName].filter(Boolean);
    if (tokens.length) {
      return tokens.join(' ');
    }
    if (conversation.host.username) {
      return `@${conversation.host.username}`;
    }
    return 'Hôte PUOL';
  }, [conversation?.host]);

  const hostAvatarUri = conversation?.host?.avatarUrl ?? conversation?.listing?.coverPhotoUrl ?? null;

  const hostProfileLabel = useMemo(() => {
    const role = conversation?.host?.role?.toLowerCase() ?? null;
    const landlordStatus = conversation?.host?.landlordStatus?.toLowerCase() ?? null;
    const hostStatus = conversation?.host?.hostStatus?.toLowerCase() ?? null;

    if (role === 'landlord' || landlordStatus === 'approved' || landlordStatus === 'pending') {
      return 'Bailleur';
    }

    if (role === 'host' || hostStatus === 'approved' || hostStatus === 'pending') {
      return 'Hôte';
    }

    return 'Hôte';
  }, [conversation?.host?.role, conversation?.host?.landlordStatus, conversation?.host?.hostStatus]);

  const [aiTyping, setAiTyping] = useState(false);
  const [aiTypingStep, setAiTypingStep] = useState(0);
  const aiTypingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingUntilRef = useRef<number>(0);
  const aiTypingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAiMessageIdRef = useRef<string | null>(null);
  const aiTypingBaselineMessageIdRef = useRef<string | null>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const aiTypingStartedAtRef = useRef<number | null>(null);
  const aiRevealTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [guestTypingStep, setGuestTypingStep] = useState(0);
  const guestTypingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingAiMessageId, setPendingAiMessageId] = useState<string | null>(null);
  const [revealedAiMessages, setRevealedAiMessages] = useState<Record<string, boolean>>({});

  const computeAiTotalDurationMs = useCallback((charCount: number) => {
    const safeCount = Number.isFinite(charCount) && charCount > 0 ? charCount : 0;
    if (safeCount === 0) {
      return 0;
    }
    const coreSegment = Math.min(safeCount, 240);
    const overflowSegment = Math.max(0, safeCount - 240);
    const estimated = 2200 + coreSegment * 46 + overflowSegment * 24;
    return safeCount <= 35 ? Math.max(1600, estimated) : Math.max(3000, Math.min(10500, estimated));
  }, []);

  const resetAiTypingState = () => {
    pendingUntilRef.current = 0;
    lastAiMessageIdRef.current = null;
    aiTypingBaselineMessageIdRef.current = null;
    aiTypingStartedAtRef.current = null;
    setPendingAiMessageId(null);
  };

  const revealAiMessage = useCallback((messageId: string | null) => {
    if (!messageId) {
      return;
    }
    setRevealedAiMessages((prev) => {
      if (prev[messageId] === true) {
        return prev;
      }
      return { ...prev, [messageId]: true };
    });
    setPendingAiMessageId((current) => (current === messageId ? null : current));
    if (aiRevealTimeoutsRef.current[messageId]) {
      clearTimeout(aiRevealTimeoutsRef.current[messageId]);
      delete aiRevealTimeoutsRef.current[messageId];
    }
  }, []);

  useEffect(() => {
    latestMessageIdRef.current = messages.length ? messages[messages.length - 1].id : null;
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const visitsContext = useOptionalVisits();
  const addVisit = visitsContext?.addVisit;
  const refreshVisits = visitsContext?.refreshVisits;
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [scheduledVisitDate, setScheduledVisitDate] = useState<Date | null>(null);
  const [scheduledVisitTime, setScheduledVisitTime] = useState<string>('');
  const [isSchedulingVisit, setIsSchedulingVisit] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [visitPaymentModalVisible, setVisitPaymentModalVisible] = useState(false);

  const handleOpenListingDetails = useCallback(() => {
    if (!listingId) {
      Alert.alert('Annonce indisponible', "Impossible d'afficher les détails de cette annonce pour le moment.");
      return;
    }

    router.push(`/property/${listingId}` as never);
  }, [listingId, router]);

  useLayoutEffect(() => {
    if (!aiTyping) {
      return undefined;
    }

    const baselineId = aiTypingBaselineMessageIdRef.current;

    const latestResponseMessage = (() => {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const candidate = messages[index];
        if (baselineId && candidate.id === baselineId) {
          break;
        }
        const isFromViewer = candidate.senderProfileId === viewerProfileId || candidate.senderRole === senderRole;
        if (!isFromViewer) {
          return candidate;
        }
      }
      return null;
    })();

    if (!latestResponseMessage) {
      return undefined;
    }

    const messageId = latestResponseMessage.id;

    if (lastAiMessageIdRef.current !== messageId) {
      lastAiMessageIdRef.current = messageId;
      const contentLength = (latestResponseMessage.content ?? '').trim().length;
      const desiredTotalDuration = computeAiTotalDurationMs(contentLength);
      if (desiredTotalDuration <= 0) {
        revealAiMessage(messageId);
        setAiTyping(false);
        resetAiTypingState();
        return undefined;
      }

      const startedAt = aiTypingStartedAtRef.current ?? Date.now();
      const elapsed = Math.max(0, Date.now() - startedAt);
      const remainingForMessage = Math.max(0, desiredTotalDuration - elapsed);
      if (remainingForMessage <= 450) {
        revealAiMessage(messageId);
        setAiTyping(false);
        resetAiTypingState();
        return undefined;
      }
      const boundedRemaining = Math.max(650, Math.min(remainingForMessage, 7800));
      pendingUntilRef.current = Date.now() + boundedRemaining;

      setPendingAiMessageId((current) => {
        if (current && current !== messageId) {
          revealAiMessage(current);
        }
        return messageId;
      });
      setRevealedAiMessages((prev) => ({ ...prev, [messageId]: false }));
      if (aiRevealTimeoutsRef.current[messageId]) {
        clearTimeout(aiRevealTimeoutsRef.current[messageId]);
      }
      aiRevealTimeoutsRef.current[messageId] = setTimeout(() => {
        revealAiMessage(messageId);
        setAiTyping(false);
        resetAiTypingState();
      }, boundedRemaining);
    }

    const remaining = Math.max(0, pendingUntilRef.current - Date.now());
    if (remaining <= 0) {
      revealAiMessage(messageId);
      setAiTyping(false);
      resetAiTypingState();
      return undefined;
    }

    const timeout = setTimeout(() => {
      revealAiMessage(messageId);
      setAiTyping(false);
      resetAiTypingState();
    }, remaining);

    return () => clearTimeout(timeout);
  }, [messages, aiTyping, computeAiTotalDurationMs, viewerProfileId, senderRole, revealAiMessage]);

  useEffect(() => {
    if (aiFallbackTimeoutRef.current) {
      clearTimeout(aiFallbackTimeoutRef.current);
      aiFallbackTimeoutRef.current = null;
    }

    if (!aiTyping) {
      resetAiTypingState();
      return undefined;
    }

    aiFallbackTimeoutRef.current = setTimeout(() => {
      setAiTyping(false);
      aiFallbackTimeoutRef.current = null;
      resetAiTypingState();
    }, 15000);

    return () => {
      if (aiFallbackTimeoutRef.current) {
        clearTimeout(aiFallbackTimeoutRef.current);
        aiFallbackTimeoutRef.current = null;
      }
    };
  }, [aiTyping]);

  useEffect(() => {
    if (aiTyping) {
      if (aiTypingIntervalRef.current) {
        clearInterval(aiTypingIntervalRef.current);
      }
      aiTypingIntervalRef.current = setInterval(() => {
        setAiTypingStep((prev) => (prev + 1) % 3);
      }, 420);
    } else if (aiTypingIntervalRef.current) {
      clearInterval(aiTypingIntervalRef.current);
      aiTypingIntervalRef.current = null;
      setAiTypingStep(0);
    }

    return () => {
      if (aiTypingIntervalRef.current) {
        clearInterval(aiTypingIntervalRef.current);
        aiTypingIntervalRef.current = null;
      }
    };
  }, [aiTyping]);

  const subtitle = useMemo(() => {
    const host = conversation?.host;
    if (!host) {
      return hostDisplayName;
    }

    const nameTokens = [host.firstName, host.lastName].filter(Boolean);
    const displayName = nameTokens.length ? nameTokens.join(' ') : host.username ?? hostDisplayName;
    return `${displayName} • ${hostProfileLabel}`;
  }, [conversation?.host, hostDisplayName, hostProfileLabel]);

  const title = useMemo(() => {
    const listingTitle = conversation?.listing?.title;
    if (listingTitle) {
      return listingTitle;
    }
    const otherParticipant = viewerRole === 'guest' ? conversation?.host : conversation?.guest;
    if (otherParticipant?.firstName && otherParticipant?.lastName) {
      return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    }
    return hostDisplayName;
  }, [conversation, viewerRole, hostDisplayName]);

  const headerAvatarUri = useMemo(() => {
    if (!conversation) return null;
    const otherParticipant = viewerRole === 'guest' ? conversation.host : conversation.guest;
    return otherParticipant?.avatarUrl ?? conversation.listing?.coverPhotoUrl ?? null;
  }, [conversation, viewerRole]);

  const fallbackInitials = useMemo(() => {
    if (!conversation) return 'PUOL';
    const otherParticipant = viewerRole === 'guest' ? conversation.host : conversation.guest;
    const listingTitle = conversation.listing?.title;
    const candidate = otherParticipant
      ? [otherParticipant.firstName, otherParticipant.lastName].filter(Boolean).join(' ') || otherParticipant.username
      : listingTitle;
    if (!candidate) return 'PUOL';
    return candidate
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2);
  }, [conversation, viewerRole]);

  const canSendMessage = Boolean(isLoggedIn && viewerProfileId && conversation && viewerRole !== 'unknown');

  const isGuestTyping = viewerRole === 'guest' && draft.trim().length > 0;

  useEffect(() => {
    if (isGuestTyping) {
      if (guestTypingIntervalRef.current) {
        clearInterval(guestTypingIntervalRef.current);
      }
      guestTypingIntervalRef.current = setInterval(() => {
        setGuestTypingStep((prev) => (prev + 1) % 3);
      }, 420);
    } else if (guestTypingIntervalRef.current) {
      clearInterval(guestTypingIntervalRef.current);
      guestTypingIntervalRef.current = null;
      setGuestTypingStep(0);
    }

    return () => {
      if (guestTypingIntervalRef.current) {
        clearInterval(guestTypingIntervalRef.current);
        guestTypingIntervalRef.current = null;
      }
    };
  }, [isGuestTyping]);

  useEffect(() => {
    return () => {
      if (aiTypingDelayRef.current) {
        clearTimeout(aiTypingDelayRef.current);
        aiTypingDelayRef.current = null;
      }
      Object.values(aiRevealTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
      aiRevealTimeoutsRef.current = {};
    };
  }, []);

  const handleSend = async () => {
    if (!canSendMessage) {
      router.push('/login' as never);
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed.length) {
      return;
    }

    if (viewerRole === 'guest') {
      if (!aiTypingBaselineMessageIdRef.current) {
        aiTypingBaselineMessageIdRef.current = latestMessageIdRef.current;
      }
      if (aiTypingDelayRef.current) {
        clearTimeout(aiTypingDelayRef.current);
      }
      aiTypingDelayRef.current = setTimeout(() => {
        lastAiMessageIdRef.current = null;
        aiTypingBaselineMessageIdRef.current = latestMessageIdRef.current;
        aiTypingStartedAtRef.current = Date.now();
        setAiTyping(true);
        aiTypingDelayRef.current = null;
      }, 600 + Math.min(1200, Math.max(0, Math.floor(trimmed.length * 20))));
    }

    const lower = trimmed.toLowerCase();
    const visitIntents = [
      'je souhaite visiter',
      'j’aimerais visiter',
      "j'aimerais visiter",
      'je veux visiter',
      'programmer une visite',
      'planifier une visite',
      'réserver une visite',
      'reserver une visite',
      'est-ce que c’est possible de programmer une visite',
      "est-ce que c'est possible de programmer une visite",
      'prendre un créneau',
      'prendre rendez-vous pour visite',
      'rendez-vous visite',
    ];
    const hasVisitIntent = visitIntents.some((phrase) => lower.includes(phrase));

    await sendMessage({
      senderProfileId,
      senderRole,
      content: trimmed,
      metadata: hasVisitIntent
        ? {
            intent: 'ui:visit_schedule',
            visitSuggestion: true,
          }
        : undefined,
    });
    setDraft('');
    scrollToEnd();
  };

  const handleSoftDelete = async (messageId: string) => {
    await softDeleteMessage(messageId);
  };

  const handleVisitSuggestionPress = () => {
    if (!isLoggedIn || !viewerProfileId) {
      router.push('/login' as never);
      return;
    }
    if (!conversation?.listingId) {
      Alert.alert('Planification indisponible', "Impossible de planifier une visite pour cette annonce pour le moment.");
      return;
    }

    if (!addVisit) {
      Alert.alert(
        'Planification indisponible',
        "La fonctionnalité de visites n'est pas disponible pour le moment. Mettez l'application à jour ou réessayez plus tard.",
      );
      return;
    }

    const proceed = () => {
      setSelectedListingId(conversation.listingId);
      setScheduledVisitDate(null);
      setScheduledVisitTime('');
      setVisitModalVisible(true);
    };

    const priceLabel = CHAT_VISIT_PRICE_FCFA.toLocaleString('fr-FR');
    Alert.alert(
      'Frais de visite',
      `Chaque visite coûte ${priceLabel} FCFA. Souhaitez-vous continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', style: 'default', onPress: proceed },
      ],
      { cancelable: true },
    );
  };

  const handleCloseVisitModal = () => {
    setVisitModalVisible(false);
    setSelectedListingId(null);
  };

  const handleVisitScheduleConfirm = (date: Date, time: string) => {
    const listingId = selectedListingId ?? conversation?.listingId;
    if (!listingId || !conversation) {
      Alert.alert('Planification indisponible', "Les informations nécessaires pour programmer la visite sont manquantes.");
      return;
    }

    setScheduledVisitDate(date);
    setScheduledVisitTime(time);
    setVisitModalVisible(false);
    setVisitPaymentModalVisible(true);
  };

  const handleVisitPaymentCancel = () => {
    setVisitPaymentModalVisible(false);
    setIsSchedulingVisit(false);
  };

  const handleVisitPaymentBack = () => {
    setVisitPaymentModalVisible(false);
    setVisitModalVisible(true);
  };

  const handleVisitPaymentSuccess = async () => {
    if (!addVisit) {
      Alert.alert(
        'Planification indisponible',
        "La fonctionnalité de visites n'est pas disponible pour le moment. Mettez l'application à jour ou réessayez plus tard.",
      );
      return;
    }

    const listingId = selectedListingId ?? conversation?.listingId;
    if (!listingId || !conversation || !scheduledVisitDate || !scheduledVisitTime) {
      Alert.alert('Planification indisponible', "Les informations nécessaires pour programmer la visite sont manquantes.");
      return;
    }

    const listing = conversation.listing;
    const propertyLocation = [listing?.district, listing?.city].filter(Boolean).join(', ') || 'Localisation PUOL';

    setIsSchedulingVisit(true);

    try {
      await addVisit({
        propertyId: listingId,
        propertyTitle: listing?.title ?? 'Annonce PUOL',
        propertyImage: listing?.coverPhotoUrl ?? null,
        propertyLocation,
        propertyBedrooms: null,
        propertyKitchens: null,
        propertyLivingRooms: null,
        propertyType: null,
        propertySurfaceArea: null,
        propertyIsRoadside: null,
        visitDate: scheduledVisitDate,
        visitTime: scheduledVisitTime,
        amount: CHAT_VISIT_PRICE_FCFA,
        notes: null,
      });

      await refreshVisits?.().catch((err) => {
        console.warn('[ConversationScreen] refreshVisits après planification impossible', err);
      });

      Alert.alert('Visite programmée', 'Votre visite a été enregistrée. Nous vous confirmerons le créneau rapidement.');
      setSelectedListingId(null);
      setScheduledVisitDate(null);
      setScheduledVisitTime('');
    } catch (error) {
      console.error('[ConversationScreen] Paiement visite échoué', error);
      Alert.alert('Planification impossible', "Nous n'avons pas pu programmer cette visite. Réessayez dans un instant.");
    } finally {
      setIsSchedulingVisit(false);
      setVisitPaymentModalVisible(false);
    }
  };

  const renderMessage = (message: ListedMessage) => {
    const isAiMessage = message.fromAI || message.senderRole === 'ai';
    const impersonatedHost = isAiMessage && viewerRole === 'guest';
    const isMine = impersonatedHost ? false : message.senderProfileId === viewerProfileId || (message.senderRole === senderRole && senderRole === 'guest');
    const showAdminBadge = message.senderRole === 'system';
    const showEscalation = message.escalatedToHost || message.requiresHostAction;
    const timestampLabel = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const metadataRecord =
      typeof message.metadata === 'object' && message.metadata !== null ? (message.metadata as Record<string, any>) : null;
    const intentCandidate =
      typeof metadataRecord?.intent === 'string'
        ? metadataRecord.intent
        : typeof metadataRecord?.intent === 'object' && metadataRecord.intent !== null
          ? typeof (metadataRecord.intent as Record<string, any>).name === 'string'
            ? (metadataRecord.intent as Record<string, any>).name
            : typeof (metadataRecord.intent as Record<string, any>).value === 'string'
              ? (metadataRecord.intent as Record<string, any>).value
              : null
          : null;
    const detectedIntentFromContent = detectVisitIntentFromContent(message.content);
    const asksScheduleQuestion = isAiMessage && detectVisitScheduleQuestionFromContent(message.content);
    const visitSuggestion =
      viewerRole === 'guest' &&
      isAiMessage &&
      (metadataRecord?.visitSuggestion === true || (detectedIntentFromContent && asksScheduleQuestion));

    console.debug('[ConversationScreen][visit-btn]', {
      messageId: message.id,
      normalizedIntent:
        intentCandidate ??
        (metadataRecord?.visitSuggestion === true ? 'ui:visit_schedule' : null) ??
        (detectedIntentFromContent ? 'ui:visit_schedule' : null),
      isAiMessage,
      viewerRole,
      intentCandidate,
      metadataVisitSuggestion: metadataRecord?.visitSuggestion,
      detectedIntentFromContent,
      asksScheduleQuestion,
      metadataIntent: metadataRecord?.intent,
    });

    const authorDisplayName = impersonatedHost
      ? hostDisplayName
      : message.author
          ? [message.author.firstName, message.author.lastName].filter(Boolean).join(' ') || message.author.username || 'PUOL'
          : undefined;

    const avatarUri = impersonatedHost ? hostAvatarUri : message.author?.avatarUrl ?? null;

    const avatarNode = !isMine ? (
      <TouchableOpacity onPress={handleOpenListingDetails} activeOpacity={0.8} disabled={!listingId}>
        <Avatar
          source={avatarUri ? { uri: avatarUri } : undefined}
          name={authorDisplayName ?? 'PUOL'}
          size="small"
        />
      </TouchableOpacity>
    ) : null;

    const bubbleStyles = [
      styles.messageBubble,
      isMine ? styles.messageBubbleMine : styles.messageBubbleGuest,
      showEscalation && styles.messageBubbleWarning,
    ];

    const textStyles = [styles.messageText, isMine ? styles.messageTextMine : styles.messageTextGuest];

    const rowStyles = [
      styles.messageRow,
      isMine ? styles.messageRowMine : styles.messageRowGuest,
    ];

    if (isAiMessage && revealedAiMessages[message.id] === false) {
      return null;
    }

    return (
      <View key={message.id} style={rowStyles}>
        {avatarNode}
        <View style={styles.messageContentBlock}>
          {!isMine && authorDisplayName ? (
            <Text style={styles.messageAuthorLabel} onPress={handleOpenListingDetails} suppressHighlighting>
              {authorDisplayName}
            </Text>
          ) : null}
          <View style={bubbleStyles}>
            {showAdminBadge ? (
              <View style={styles.messageBadge}>
                <Feather name="flag" size={10} color={isMine ? '#FFFFFF' : PUOL_GREEN} />
                <Text style={[styles.messageBadgeText, isMine && styles.messageBadgeTextMine]}>Action requise</Text>
              </View>
            ) : null}
            <Text style={textStyles}>{message.content}</Text>
            {visitSuggestion ? (
              <TouchableOpacity
                style={[styles.visitCtaButton, isSchedulingVisit && styles.visitCtaButtonDisabled]}
                activeOpacity={0.8}
                onPress={handleVisitSuggestionPress}
                disabled={isSchedulingVisit}
              >
                {isSchedulingVisit ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.visitCtaText}>Programmation…</Text>
                  </>
                ) : (
                  <>
                    <Feather name="calendar" size={14} color="#FFFFFF" />
                    <Text style={styles.visitCtaText}>Choisir une date de visite</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            <View style={styles.messageMetaRow}>
              <Text style={[styles.messageTimestamp, isMine ? styles.messageTimestampMine : styles.messageTimestampGuest]}>
                {timestampLabel}
              </Text>
              {isMine ? (
                <TouchableOpacity style={styles.messageAction} onPress={() => handleSoftDelete(message.id)}>
                  <Feather name="trash-2" size={14} color={isMine ? '#FFFFFF' : MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTypingDots = (step: number, activeColor: string, inactiveOpacity = 0.35) => (
    <View style={styles.typingDots}>
      {[0, 1, 2].map((index) => {
        const isActive = step === index;
        return (
          <View
            key={index}
            style={[
              styles.typingDot,
              {
                backgroundColor: activeColor,
                opacity: isActive ? 1 : inactiveOpacity,
                transform: [{ scale: isActive ? 1 : 0.85 }],
              },
            ]}
          />
        );
      })}
    </View>
  );

  if (!conversation && !isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Conversation introuvable</Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.replace('/messages' as never)}>
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.backCtaText}>Retour aux messages</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerContent}
          activeOpacity={0.85}
          onPress={handleOpenListingDetails}
          disabled={!listingId}
        >
          <Avatar source={headerAvatarUri ? { uri: headerAvatarUri } : undefined} name={fallbackInitials} size="large" />
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.contentWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={PUOL_GREEN} />
            <Text style={styles.loadingLabel}>Chargement de la conversation…</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshMessages} tintColor={PUOL_GREEN} />}
            onContentSizeChange={scrollToEnd}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyThread}>
                <Feather name="message-circle" size={28} color={MUTED} />
                <Text style={styles.emptyThreadTitle}>Démarrez la conversation</Text>
                <Text style={styles.emptyThreadSubtitle}>
                  Présentez-vous ou posez une question {hostProfileLabel === 'Bailleur' ? 'au bailleur.' : "à l'hôte."}
                </Text>
              </View>
            ) : (
              <>
                {messages.map((message) => renderMessage(message))}
                {isGuestTyping ? (
                  <View style={[styles.messageRow, styles.messageRowMine]}>
                    <View style={[styles.typingBubble, styles.typingBubbleMine]}>
                      {renderTypingDots(guestTypingStep, '#FFFFFF', 0.45)}
                    </View>
                  </View>
                ) : null}
                {aiTyping && viewerRole === 'guest' && pendingAiMessageId ? (
                  <View style={[styles.messageRow, styles.messageRowGuest]}>
                    <TouchableOpacity onPress={handleOpenListingDetails} activeOpacity={0.8} disabled={!listingId}>
                      <Avatar
                        source={hostAvatarUri ? { uri: hostAvatarUri } : undefined}
                        name={hostDisplayName}
                        size="small"
                      />
                    </TouchableOpacity>
                    <View style={styles.messageContentBlock}>
                      <Text style={styles.messageAuthorLabel} onPress={handleOpenListingDetails} suppressHighlighting>
                        {hostDisplayName}
                      </Text>
                      <View style={[styles.messageBubble, styles.messageBubbleGuest, styles.typingBubble]}>
                        {renderTypingDots(aiTypingStep, MUTED, 0.2)}
                      </View>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-triangle" size={14} color="#FFFFFF" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire un message..."
            placeholderTextColor={MUTED}
            multiline
            editable={canSendMessage && !isSending}
            onFocus={scrollToEnd}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || !canSendMessage || isSending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || !canSendMessage || isSending}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <VisitScheduleModal
        visible={visitModalVisible && Boolean((selectedListingId ?? conversation?.listingId) ?? false)}
        onClose={handleCloseVisitModal}
        onConfirm={handleVisitScheduleConfirm}
        listingId={selectedListingId ?? conversation?.listingId ?? ''}
        initialDate={scheduledVisitDate}
        initialTime={scheduledVisitTime}
      />
      <PaymentModal
        visible={visitPaymentModalVisible}
        onClose={handleVisitPaymentCancel}
        onSuccess={handleVisitPaymentSuccess}
        onBack={handleVisitPaymentBack}
        amount={CHAT_VISIT_PRICE_FCFA}
        title="Paiement de la visite"
        description={scheduledVisitDate
          ? `Visite le ${scheduledVisitDate.toLocaleDateString('fr-FR')} à ${scheduledVisitTime}`
          : 'Paiement de votre visite'}
        infoMessage="Le paiement valide définitivement votre créneau de visite."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  thread: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
  },
  emptyThread: {
    alignItems: 'center',
    marginTop: 48,
    gap: 6,
  },
  emptyThreadTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: DARK,
  },
  emptyThreadSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '86%',
  },
  messageContainerGuest: {
    alignSelf: 'flex-start',
  },
  messageContainerMine: {
    alignSelf: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 14,
    maxWidth: '92%',
  },
  messageRowGuest: {
    alignSelf: 'flex-start',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageContentBlock: {
    flexShrink: 1,
    gap: 6,
  },
  messageAuthorLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 18,
    padding: 14,
  },
  messageBubbleGuest: {
    backgroundColor: '#F3F4F6',
  },
  messageBubbleMine: {
    backgroundColor: PUOL_GREEN,
  },
  messageBubbleWarning: {
    borderWidth: 1,
    borderColor: '#FB923C',
    backgroundColor: 'rgba(251, 146, 60, 0.12)',
  },
  messageText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextGuest: {
    color: DARK,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageTimestamp: {
    fontFamily: 'Manrope',
    fontSize: 11,
  },
  messageTimestampGuest: {
    color: MUTED,
  },
  messageTimestampMine: {
    color: 'rgba(255,255,255,0.8)',
  },
  messageAction: {
    paddingHorizontal: 6,
  },
  messageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  messageBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: PUOL_GREEN,
    fontWeight: '600',
  },
  messageBadgeTextMine: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#DC2626',
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PUOL_GREEN,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  visitCtaButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: PUOL_GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  visitCtaButtonDisabled: {
    opacity: 0.6,
  },
  visitCtaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  typingBubble: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
  },
  typingBubbleMine: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: PUOL_GREEN,
    borderRadius: 18,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MUTED,
    opacity: 0.4,
  },
  typingDotSecond: {
    opacity: 0.7,
  },
  typingDotThird: {
    opacity: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
  },
  backCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PUOL_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backCtaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
