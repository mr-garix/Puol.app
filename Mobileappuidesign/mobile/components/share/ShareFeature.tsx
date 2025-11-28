import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
  Share,
  Alert,
  Image,
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.65;

interface ShareButtonProps {
  onPress: () => void;
  shareCount?: number;
  color?: string;
}

export const ShareIconButton: React.FC<ShareButtonProps> = ({
  onPress,
  shareCount = 0,
  color = '#FFFFFF',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.shareButton}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <View style={styles.iconCircle}>
          <Image
            source={require('../../assets/icons/feed-icon-share.png')}
            style={{ width: 24, height: 24, tintColor: color }}
            resizeMode="contain"
          />
        </View>

        {shareCount > 0 && (
          <Text style={[styles.shareCount, { color }]}> 
            {shareCount >= 1000 ? `${(shareCount / 1000).toFixed(1)}K` : shareCount}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ShareOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  action: string;
}

const SHARE_OPTIONS: ShareOption[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '💚', color: '#25D366', action: 'whatsapp' },
  { id: 'facebook', name: 'Facebook', icon: '👍', color: '#1877F2', action: 'facebook' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F', action: 'instagram' },
  { id: 'twitter', name: 'X', icon: '🐦', color: '#000000', action: 'twitter' },
  { id: 'messenger', name: 'Messenger', icon: '💬', color: '#0084FF', action: 'messenger' },
  { id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088CC', action: 'telegram' },
  { id: 'email', name: 'Email', icon: '📧', color: '#EA4335', action: 'email' },
  { id: 'sms', name: 'SMS', icon: '💬', color: '#34C759', action: 'sms' },
  { id: 'copy', name: 'Copier', icon: '📋', color: '#2ECC71', action: 'copy' },
  { id: 'more', name: 'Plus', icon: '•••', color: '#8E8E93', action: 'more' },
];

interface ShareOptionItemProps {
  option: ShareOption;
  onPress: () => void;
  delay: number;
}

const ShareOptionItem: React.FC<ShareOptionItemProps> = ({ option, onPress, delay }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        delay,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacityAnim, scaleAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.optionItem,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity onPress={handlePress} style={styles.optionButton} activeOpacity={0.8}>
        <View style={[styles.optionIconContainer, { backgroundColor: option.color }]}>
          <Text style={styles.optionIcon}>{option.icon}</Text>
        </View>
        <Text style={styles.optionName} numberOfLines={1}>
          {option.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyUrl: string;
  onShareComplete?: (platform: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  propertyTitle,
  propertyUrl,
  onShareComplete,
}) => {
  const [copied, setCopied] = useState(false);
  const pan = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      pan.setValue(BOTTOM_SHEET_HEIGHT);
      opacity.setValue(0);
      setCopied(false);
    }
  }, [opacity, pan, visible]);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: BOTTOM_SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) {
          pan.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const handleShare = async (option: ShareOption) => {
    switch (option.action) {
      case 'copy':
        setCopied(true);
        setTimeout(() => {
          onShareComplete?.(option.action);
          closeSheet();
        }, 1500);
        break;
      case 'more':
        try {
          await Share.share({
            message: `${propertyTitle}\n\n${propertyUrl}`,
            url: propertyUrl,
            title: propertyTitle,
          });
          onShareComplete?.(option.action);
        } catch (error) {
          console.error('Erreur de partage:', error);
        }
        closeSheet();
        break;
      default:
        Alert.alert(option.name, `Partage vers ${option.name}`, [
          { text: 'OK', onPress: () => closeSheet() },
        ]);
        onShareComplete?.(option.action);
        break;
    }
  };

  const translateY = pan.interpolate({
    inputRange: [0, BOTTOM_SHEET_HEIGHT],
    outputRange: [0, BOTTOM_SHEET_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeSheet}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Partager</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {propertyTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.optionsGrid}>
              {SHARE_OPTIONS.map((option, index) => (
                <ShareOptionItem
                  key={option.id}
                  option={option}
                  onPress={() => handleShare(option)}
                  delay={index * 30}
                />
              ))}
            </View>

            <View style={styles.linkSection}>
              <Text style={styles.linkLabel}>Lien de partage</Text>
              <TouchableOpacity
                style={styles.linkContainer}
                onPress={() => handleShare(SHARE_OPTIONS[8])}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText} numberOfLines={1}>
                  {propertyUrl}
                </Text>
                <View style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>{copied ? '✓' : '📋'}</Text>
                </View>
              </TouchableOpacity>
              {copied && (
                <View style={styles.copiedBadge}>
                  <Text style={styles.copiedText}>✓ Copié !</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface ShareFeatureProps {
  propertyTitle: string;
  propertyUrl: string;
  shareCount?: number;
  buttonColor?: string;
  onShareComplete?: (platform: string) => void;
}

export const ShareFeature: React.FC<ShareFeatureProps> = ({
  propertyTitle,
  propertyUrl,
  shareCount = 0,
  buttonColor = '#FFFFFF',
  onShareComplete,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <>
      <ShareIconButton
        onPress={() => setIsModalVisible(true)}
        shareCount={shareCount}
        color={buttonColor}
      />

      <ShareModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        propertyTitle={propertyTitle}
        propertyUrl={propertyUrl}
        onShareComplete={(platform) => {
          onShareComplete?.(platform);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
  shareCount: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
    maxWidth: SCREEN_WIDTH - 100,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 20,
  },
  optionItem: {
    width: 80,
    marginBottom: 8,
  },
  optionButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionName: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  linkSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  linkLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  linkText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#666666',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  copyButtonText: {
    fontSize: 18,
  },
  copiedBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#2ECC71',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  copiedText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ShareFeature;
