import React, { useEffect, useRef } from 'react';

import { useNotifications } from '@/src/contexts/NotificationContext';
import { useVisits, type VisitRecord } from '@/src/contexts/VisitsContext';

const VisitNotificationBridge: React.FC = () => {
  const { visits } = useVisits();
  const { showNotification } = useNotifications();
  const previousStatusesRef = useRef<Record<string, VisitRecord['status']>>({});

  useEffect(() => {
    visits.forEach((visit) => {
      const previousStatus = previousStatusesRef.current[visit.id];
      if (previousStatus && previousStatus !== 'confirmed' && visit.status === 'confirmed') {
        showNotification({
          id: `visit-confirmed-${visit.id}-${Date.now()}`,
          title: 'Visite confirmée ✅',
          message: `${visit.propertyTitle} • ${visit.visitDate.slice(0, 10)} à ${visit.visitTime}`,
          action: { type: 'visit-details', visitId: visit.id },
        });
      }
      previousStatusesRef.current[visit.id] = visit.status;
    });
  }, [visits, showNotification]);

  return null;
};

export default VisitNotificationBridge;
