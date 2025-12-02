import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Image,
  Text,
} from 'react-native';

interface CommentInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  userAvatar?: string;
  replyingTo?: string;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = 'Ajouter un commentaire...',
  userAvatar,
  replyingTo,
  onCancelReply,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleSubmit = () => {
    if (text.trim().length === 0 || disabled) return;

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onSubmit(text.trim());
    setText('');
    inputRef.current?.blur();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 130 : 80}
    >
      {replyingTo && onCancelReply && (
        <View style={styles.replyingToContainer}>
          <View style={styles.replyingToBar} />
          <View style={styles.replyingToContent}>
            <Text style={styles.replyingToText}>Réponse à {replyingTo}</Text>
            <TouchableOpacity
              onPress={onCancelReply}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.cancelReplyButton}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.container, isFocused && styles.containerFocused]}>
        {userAvatar && (
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#999999"
            value={text}
            onChangeText={setText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            maxLength={500}
            editable={!disabled}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSubmit}
          />

          {text.trim().length > 0 && (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.sendButton}
                activeOpacity={0.8}
              >
                <View style={styles.sendButtonInner}>
                  <Text style={styles.sendButtonText}>➤</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginBottom: 20,
  },
  containerFocused: {
    borderTopColor: '#2ECC71',
    borderTopWidth: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 15,
    color: '#000000',
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  replyingToContainer: {
    backgroundColor: '#F8F8F8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  replyingToBar: {
    position: 'absolute',
    left: 16,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#2ECC71',
    borderRadius: 2,
  },
  replyingToContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
  },
  replyingToText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
  },
  cancelReplyButton: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '300',
    paddingHorizontal: 8,
  },
});
