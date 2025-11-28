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

interface ChatbotPopupProps {
  visible: boolean;
  onClose: () => void;
  propertyTitle?: string;
}

type Sender = 'user' | 'bot';

interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: Date;
}

export const ChatbotPopup: React.FC<ChatbotPopupProps> = ({ visible, onClose, propertyTitle }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [keyboardPadding, setKeyboardPadding] = useState(92);
  const scrollViewRef = useRef<ScrollView | null>(null);

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
      const botMessage: Message = {
        id: `${Date.now() + 1}`,
        text: 'Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais. Pour une réponse plus rapide, contactez-nous également sur WhatsApp.',
        sender: 'bot',
        timestamp: new Date(),
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
                <MessageBubble key={message.id} message={message} index={index} />
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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
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
});

export default ChatbotPopup;
