import { useEffect } from 'react';

import { useProfile } from '@/src/contexts/ProfileContext';
import { useNotifications } from '@/src/contexts/NotificationContext';

const ApplicationStatusNotificationBridge = () => {
  const { recentStatusChange, clearRecentStatusChange } = useProfile();
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (!recentStatusChange) {
      return;
    }

    const { scope, current } = recentStatusChange;

    if (current !== 'approved' && current !== 'rejected') {
      clearRecentStatusChange();
      return;
    }

    const title = scope === 'host' ? 'Espace Hôte' : 'Espace Bailleur';
    const message =
      current === 'approved'
        ?
          scope === 'host'
            ? 'Ta demande hôte est approuvée. Tu peux accéder à ton tableau de bord.'
            : 'Ta demande bailleur est approuvée. Tu peux accéder à ton tableau de bord.'
        :
          scope === 'host'
            ? 'Ta demande hôte a été refusée. Contacte le support pour en savoir plus.'
            : 'Ta demande bailleur a été refusée. Contacte le support pour en savoir plus.';

    const actionHref = current === 'approved'
      ? scope === 'host' ? '/host-dashboard' : '/landlord-dashboard'
      : scope === 'host' ? '/host' : '/landlord';

    showNotification({
      id: `${scope}-application-${current}-${Date.now()}`,
      title,
      message,
      action: { type: 'link', href: actionHref },
      durationMs: 8000,
    });

    clearRecentStatusChange();
  }, [clearRecentStatusChange, recentStatusChange, showNotification]);

  return null;
};

export default ApplicationStatusNotificationBridge;
