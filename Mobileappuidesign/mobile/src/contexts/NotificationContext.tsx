import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type NotificationAction =
  | { type: 'visit-details'; visitId: string }
  | { type: 'link'; href: string };

export type NotificationPayload = {
  id: string;
  title: string;
  message: string;
  action?: NotificationAction;
  durationMs?: number;
};

interface NotificationContextValue {
  notification: NotificationPayload | null;
  showNotification: (payload: NotificationPayload) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const dismissNotification = useCallback(() => {
    console.log('[NotificationContext] dismissNotification called');
    clearHideTimeout();
    setNotification(null);
    console.log('[NotificationContext] Notification dismissed');
  }, []);

  const showNotification = useCallback((payload: NotificationPayload) => {
    console.log('[NotificationContext] showNotification called with payload:', JSON.stringify(payload, null, 2));
    clearHideTimeout();
    
    // Forcer un délai pour s'assurer que le state est bien mis à jour
    setNotification(payload);
    console.log('[NotificationContext] Notification state updated');

    const duration = payload.durationMs ?? 8000;
    if (duration > 0) {
      console.log(`[NotificationContext] Setting auto-dismiss timeout for ${duration}ms`);
      hideTimeoutRef.current = setTimeout(() => {
        console.log(`[NotificationContext] Auto-dismissing notification: ${payload.id}`);
        setNotification((current) => {
          const shouldDismiss = current?.id === payload.id;
          console.log(`[NotificationContext] Should dismiss ${payload.id}? ${shouldDismiss}`);
          return shouldDismiss ? null : current;
        });
        hideTimeoutRef.current = null;
      }, duration);
    }
  }, []);

  useEffect(() => () => clearHideTimeout(), []);

  const value: NotificationContextValue = {
    notification,
    showNotification,
    dismissNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
