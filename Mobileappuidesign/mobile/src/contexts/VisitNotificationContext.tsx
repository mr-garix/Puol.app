import React, { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type VisitNotificationPayload = {
  visitId: string;
  guestName: string;
  listingTitle: string;
  visitDate: string;
  visitTime: string;
  landlordProfileId: string;
};

interface VisitNotificationContextValue {
  notifyNewVisit: (payload: VisitNotificationPayload) => void;
}

const VisitNotificationContext = createContext<VisitNotificationContextValue | undefined>(undefined);

export const VisitNotificationProvider = ({ children }: { children: ReactNode }) => {
  const notifyNewVisit = useCallback((payload: VisitNotificationPayload) => {
    console.log('[VisitNotificationContext] notifyNewVisit called:', payload);
    // Émettre un événement global que LandlordVisitNotificationBridge peut écouter
    // via un système d'événements ou via une mise à jour du contexte
  }, []);

  const value: VisitNotificationContextValue = {
    notifyNewVisit,
  };

  return (
    <VisitNotificationContext.Provider value={value}>
      {children}
    </VisitNotificationContext.Provider>
  );
};

export const useVisitNotification = () => {
  const context = useContext(VisitNotificationContext);
  if (!context) {
    throw new Error('useVisitNotification must be used within VisitNotificationProvider');
  }
  return context;
};
