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
    clearHideTimeout();
    setNotification(null);
  }, []);

  const showNotification = useCallback((payload: NotificationPayload) => {
    clearHideTimeout();
    setNotification(payload);

    const duration = payload.durationMs ?? 8000;
    if (duration > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setNotification((current) => (current?.id === payload.id ? null : current));
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
