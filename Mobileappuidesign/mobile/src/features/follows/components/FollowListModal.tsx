import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { ProfileFollowListItem } from '@/src/features/follows/services';

type FollowListModalProps = {
  visible: boolean;
  type: 'followers' | 'following';
  items: ProfileFollowListItem[];
  loading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  friendIds?: Set<string>;
  onFollowBack?: (profileId: string) => void;
  onUnfollow?: (profileId: string) => void;
  followActionLoadingId?: string | null;
  unfollowActionLoadingId?: string | null;
  viewerMode?: boolean;
  viewerFollowingIds?: Set<string>;
  viewerFollowerIds?: Set<string>;
  viewerId?: string | null;
  onProfilePress?: (profileId: string) => void;
  ownerView?: boolean;
};

const buildInitialsAvatar = (firstName?: string | null, lastName?: string | null) => {
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase() || 'US';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0F172A&color=ffffff`;
};

export const FollowListModal: React.FC<FollowListModalProps> = ({
  visible,
  type,
  items,
  loading = false,
  onClose,
  onRefresh,
  friendIds,
  onFollowBack,
  onUnfollow,
  followActionLoadingId,
  unfollowActionLoadingId,
  viewerMode = false,
  viewerFollowingIds,
  viewerFollowerIds,
  viewerId,
  onProfilePress,
  ownerView = false,
}) => {
  const title = type === 'followers' ? 'Followers' : 'Abonnements';

  const renderItem = ({ item }: { item: ProfileFollowListItem }) => {
    const fullName = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || item.username || 'Utilisateur PUOL';
    const username = item.username ? `@${item.username}` : item.city ?? 'PUOL';
    const dateLabel = item.followedSince
      ? new Date(item.followedSince).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;
    const mutualWithOwner = ownerView ? friendIds?.has(item.id) ?? false : false;
    const hasViewerFollowingSet = Boolean(viewerId && viewerFollowingIds?.size);
    const hasViewerFollowerSet = Boolean(viewerId && viewerFollowerIds?.size);
    const viewerFollowsTarget = hasViewerFollowingSet ? viewerFollowingIds!.has(item.id) : false;
    const targetFollowsViewer = hasViewerFollowerSet ? viewerFollowerIds!.has(item.id) : false;
    const isSelf = viewerId ? viewerId === item.id : false;

    let actionContent: React.ReactNode = null;

    if (!isSelf) {
      const isFollowLoading = followActionLoadingId === item.id;
      const isUnfollowLoading = unfollowActionLoadingId === item.id;
      const currentAction = viewerFollowsTarget ? 'unfollow' : 'follow';
      const isProcessing = currentAction === 'follow' ? isFollowLoading : isUnfollowLoading;
      const canInteract = viewerId
        ? currentAction === 'follow'
          ? Boolean(onFollowBack)
          : Boolean(onUnfollow)
        : Boolean(onFollowBack);

      let actionLabel = 'Suivre';
      if (!viewerId) {
        actionLabel = 'Suivre';
      } else if (ownerView && mutualWithOwner) {
        actionLabel = 'Ami(e)';
      } else if (viewerFollowsTarget) {
        actionLabel = 'Suivi(e)';
      } else if (targetFollowsViewer) {
        actionLabel = 'Suivre en retour';
      }

      const handlePrimaryAction = () => {
        if (isProcessing || !canInteract) {
          return;
        }
        if (!viewerId) {
          onFollowBack?.(item.id);
          return;
        }
        if (currentAction === 'follow') {
          onFollowBack?.(item.id);
        } else {
          onUnfollow?.(item.id);
        }
      };

      const buttonStyles = viewerFollowsTarget
        ? [styles.statusPill, styles.followingPill, (!canInteract || isProcessing) && styles.statusPillDisabled]
        : [styles.actionButton, (!canInteract || isProcessing) && styles.actionButtonDisabled];

      const textStyles = viewerFollowsTarget
        ? [styles.pillText, styles.followingPillText]
        : [styles.actionButtonText];

      actionContent = (
        <TouchableOpacity
          style={buttonStyles}
          onPress={handlePrimaryAction}
          activeOpacity={0.8}
          disabled={!canInteract || isProcessing}
        >
          <Text style={textStyles}>{isProcessing ? '...' : actionLabel}</Text>
        </TouchableOpacity>
      );
    }

    const handleProfilePress = () => {
      if (onProfilePress) {
        onProfilePress(item.id);
      }
    };

    return (
      <View style={styles.listItem}>
        <View style={styles.itemInfo}>
          <TouchableOpacity
            onPress={handleProfilePress}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Image
              source={{ uri: item.avatarUrl || buildInitialsAvatar(item.firstName, item.lastName) }}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleProfilePress}
            activeOpacity={0.7}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            style={styles.itemContentButton}
          >
            <View style={styles.itemContent}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.fullName}>{fullName}</Text>
                {item.isVerified && (
                  <Image
                    source={require('@/assets/icons/feed-icon-verified.png')}
                    style={styles.verifiedBadgeIcon}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={styles.username}>{username}</Text>
              {dateLabel && <Text style={styles.metaText}>Depuis {dateLabel}</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.itemAction}>{actionContent}</View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Feather name="x" size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text style={styles.loaderText}>Chargement...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={36} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {type === 'followers' ? 'Pas encore de followers' : "Vous ne suivez personne"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {type === 'followers'
                ? 'Partagez votre profil pour attirer votre première audience.'
                : 'Partez découvrir des hôtes et suivez vos favoris.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={onRefresh}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 23, 42, 0.08)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 16,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemContentButton: {
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  itemContent: {
    flex: 1,
    marginLeft: 14,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  verifiedBadgeIcon: {
    width: 18,
    height: 18,
  },
  username: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  metaText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  itemAction: {
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  actionButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  actionButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  followingPill: {
    backgroundColor: '#2ECC71',
    borderColor: '#2ECC71',
  },
  followingPillText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusPillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
});
