import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';

import NotificationBanner from '@/src/infrastructure/notifications/NotificationBanner';
import { useNotifications } from '@/src/contexts/NotificationContext';

const NotificationHost = () => {
  console.log('[NotificationHost] Component rendered');
  const router = useRouter();
  const { notification, dismissNotification } = useNotifications();
  
  console.log('[NotificationHost] Current notification:', notification);

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
    console.log('[NotificationHost] No notification to display');
    return null;
  }
  
  console.log('[NotificationHost] Rendering notification:', notification.id, notification.title);

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
