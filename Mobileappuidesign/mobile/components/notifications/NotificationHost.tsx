import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

import NotificationBanner from '@/components/notifications/NotificationBanner';
import { useNotifications } from '@/src/contexts/NotificationContext';

const NotificationHost = () => {
  const router = useRouter();
  const { notification, dismissNotification } = useNotifications();

  const handlePress = useCallback(() => {
    if (!notification) {
      return;
    }

    if (notification.action?.type === 'visit-details') {
      router.push({ pathname: '/visits/[id]', params: { id: notification.action.visitId } });
    } else if (notification.action?.type === 'link') {
      router.push(notification.action.href as never);
    }

    dismissNotification();
  }, [notification, router, dismissNotification]);

  if (!notification) {
    return null;
  }

  return (
    <NotificationBanner
      title={notification.title}
      message={notification.message}
      onPress={handlePress}
      onDismiss={dismissNotification}
    />
  );
};

export default NotificationHost;
