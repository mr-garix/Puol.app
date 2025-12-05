import React, { useCallback, useRef } from 'react';
import { Animated, Image, Platform, Share, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { recordListingShare, resolveShareChannel } from '@/src/features/listings/services/shareService';
import { buildListingShareUrl } from '@/src/utils/helpers';

interface ShareButtonProps {
  onPress: () => void;
  shareCount?: number;
  color?: string;
}

const ShareIconButton: React.FC<ShareButtonProps> = ({
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
    ]).start(() => {
      onPress();
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.shareButton}
        activeOpacity={0.8}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Animated.View style={styles.iconCircle}>
          <Image
            source={require('@/assets/icons/feed-icon-share.png')}
            style={{ width: 24, height: 24, tintColor: color }}
            resizeMode="contain"
          />
        </Animated.View>
        {shareCount > 0 && (
          <Text style={[styles.shareCount, { color }]}>
            {shareCount >= 1000 ? `${(shareCount / 1000).toFixed(1)}K` : shareCount}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

interface ShareFeatureProps {
  listingId: string;
  listingTitle: string;
  shareCount?: number;
  buttonColor?: string;
  profileId?: string | null;
  onShareComplete?: (platform: string) => void;
}

export const ShareFeature: React.FC<ShareFeatureProps> = ({
  listingId,
  listingTitle,
  shareCount = 0,
  buttonColor = '#FFFFFF',
  profileId = null,
  onShareComplete,
}) => {
  const handleNativeShare = useCallback(async () => {
    if (!listingId) {
      return;
    }
    const shareUrl = buildListingShareUrl(listingId);
    const message = `Regarde ce logement sur Puol 👇\n${shareUrl}`;
    try {
      const result = await Share.share({
        title: listingTitle,
        message,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        const channel =
          Platform.OS === 'ios' ? resolveShareChannel(result.activityType) : 'system_share_sheet';
        void recordListingShare({
          listingId,
          profileId,
          channel,
        });
        onShareComplete?.(channel);
      }
    } catch (error) {
      console.warn('[ShareFeature] Share error', error);
    }
  }, [listingId, listingTitle, profileId, onShareComplete]);

  return (
    <ShareIconButton
      onPress={handleNativeShare}
      shareCount={shareCount}
      color={buttonColor}
    />
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
});

export default ShareFeature;
