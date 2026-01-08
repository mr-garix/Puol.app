import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// Mots-clés pour détecter les offres de visite dans la réponse du bot
const VISIT_KEYWORDS = [
  'visite',
  'visit',
  'visiter',
  'voir',
  'voir la propriété',
  'voir l\'annonce',
  'planifier',
  'programmer',
  'schedule',
  'booking',
  'réserver',
  'disponibilité',
  'disponible',
  'quand',
  'when',
  'date',
  'heure',
  'time',
  'visiter la propriété',
  'voir la maison',
  'voir l\'appartement',
  'faire une visite',
  'organiser une visite',
  'fixer une visite',
  'prendre rendez-vous',
  'rendez-vous',
  'appointment',
  'appointment de visite',
  'visite guidée',
  'guided tour',
  'coûte',
  'coût',
  'prix',
  'tarif',
  'francs',
  'fcfa',
  'euros',
  'cost',
  'price',
];

const detectVisitKeywords = (text: string): boolean => {
  const lowerText = text.toLowerCase().trim();
  
  // 🔴 CLÉS OBLIGATOIRES : Si le texte contient "la visite coûte" suivi d'un montant, afficher le bouton
  const hasMandatoryKeyword = /la\s+visite\s+coûte\s+\d+/.test(lowerText);
  
  console.log('[ChatbotPopup] Keyword detection:', {
    text: text.substring(0, 100),
    lowerText: lowerText.substring(0, 100),
    hasMandatoryKeyword,
    hasAnyKeyword: VISIT_KEYWORDS.some(keyword => lowerText.includes(keyword)),
  });
  
  if (hasMandatoryKeyword) {
    console.log('[ChatbotPopup] ✅ MANDATORY KEYWORD DETECTED: "la visite coûte"');
    return true;
  }
  
  return VISIT_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

interface ChatbotPopupProps {
  visible: boolean;
  onClose: () => void;
  propertyTitle?: string;
  hostStatus?: string | null;
}

type Sender = 'user' | 'bot';

interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
  showScheduleButton?: boolean;
}

export const ChatbotPopup: React.FC<ChatbotPopupProps> = ({ visible, onClose, propertyTitle, hostStatus = null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [keyboardPadding, setKeyboardPadding] = useState(92);
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    console.log('[ChatbotPopup] Opened with hostStatus:', hostStatus);
  }, [visible, hostStatus]);

  useEffect(() => {
    if (visible) {
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Bonjour ! Je suis le support PUOL. Comment puis-je vous aider aujourd'hui ?${propertyTitle ? ` Vous consultez "${propertyTitle}".` : ''}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setInputValue('');
      requestAnimationFrame(() => scrollViewRef.current?.scrollToEnd({ animated: false }));
    }
  }, [visible, propertyTitle]);

  useEffect(() => {
    if (messages.length && scrollViewRef.current) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardPadding(16));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardPadding(92));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: `${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    setTimeout(() => {
      const botResponseText = 'Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais. Pour une réponse plus rapide, contactez-nous également sur WhatsApp.';
      // Détecter les mots-clés dans la réponse du bot, pas dans le message utilisateur
      const hasVisitKeywords = detectVisitKeywords(botResponseText);
      const botMessage: Message = {
        id: `${Date.now() + 1}`,
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
        showScheduleButton: hasVisitKeywords,
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={[styles.overlay, { paddingBottom: keyboardPadding }]}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Feather name="message-square" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerTitle}>Support PUOL</Text>
                  <View style={styles.statusWrapper}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>En ligne</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <Feather name="x" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>Écrivez à notre équipe</Text>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((message, index) => (
                <MessageBubble key={message.id} message={message} index={index} hostStatus={hostStatus} />
              ))}
            </ScrollView>

            <View style={styles.inputContainer}>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <Feather name="paperclip" size={18} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                <Feather name="image" size={18} color="#6B7280" />
              </TouchableOpacity>
              <View style={styles.textInputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Tapez votre message..."
                  placeholderTextColor="#9CA3AF"
                  value={inputValue}
                  onChangeText={setInputValue}
                  multiline
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />
              </View>
              <TouchableOpacity
                style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!inputValue.trim()}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface MessageBubbleProps {
  message: Message;
  index: number;
  onScheduleVisit?: () => void;
  hostStatus?: string | null;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index, onScheduleVisit, hostStatus = null }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  const timeLabel = message.timestamp.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isUser = message.sender === 'user';

  // Logs pour diagnostiquer l'affichage du bouton
  if (message.showScheduleButton && !isUser) {
    console.log('[MessageBubble] Schedule button condition check:', {
      messageId: message.id,
      showScheduleButton: message.showScheduleButton,
      isUser: isUser,
      hostStatus: hostStatus,
      shouldShowButton: hostStatus !== 'landlord',
      condition: `showScheduleButton=${message.showScheduleButton} && !isUser=${!isUser} && hostStatus!=='landlord'=${hostStatus !== 'landlord'}`,
    });
  }

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowBot,
        { opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleBot]}>
        <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>{message.text}</Text>
        {message.showScheduleButton && !isUser && hostStatus !== 'landlord' && (
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={onScheduleVisit}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.scheduleButtonText}>Planifier une visite</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.messageTime, isUser ? styles.messageTimeUser : styles.messageTimeBot]}>{timeLabel}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 72,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    height: '76%',
    marginHorizontal: 20,
    marginBottom: 0,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  messageRow: {
    maxWidth: '75%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowBot: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  messageBubbleUser: {
    backgroundColor: '#2ECC71',
    borderBottomRightRadius: 6,
  },
  messageBubbleBot: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextBot: {
    color: '#111827',
  },
  messageTime: {
    fontFamily: 'Manrope',
    fontSize: 11,
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.75)',
  },
  messageTimeBot: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
    maxHeight: 80,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  scheduleButton: {
    marginTop: 12,
    backgroundColor: '#2ECC71',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ChatbotPopup;
