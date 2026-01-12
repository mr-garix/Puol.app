// @ts-ignore
let OneSignal: any;

try {
  // Pour react-native-onesignal v5.x, l'export par défaut n'existe pas.
  // Il faut récupérer la propriété nommée OneSignal.
  const module = require('react-native-onesignal');
  OneSignal = module.OneSignal;

  console.log('[OneSignal] Module loaded successfully');
  console.log('[OneSignal] Module keys:', Object.keys(module || {}));
  console.log('[OneSignal] OneSignal keys:', Object.keys(OneSignal || {}));
  console.log('[OneSignal] Notifications type:', typeof OneSignal?.Notifications);
  console.log('[OneSignal] User type:', typeof OneSignal?.User);
} catch (error) {
  console.error('[OneSignal] Failed to load module:', error);
  OneSignal = null;
}

import Constants from 'expo-constants';

/**
 * Service OneSignal pour gérer les push notifications
 * - Identification des utilisateurs
 * - Gestion des permissions
 * - Envoi de notifications
 */

export const OneSignalService = {
  /**
   * Initialiser OneSignal (appelé au démarrage de l'app)
   */
  initialize: async () => {
    try {
      console.log('[OneSignal] === INIT START ===');
      
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Make sure react-native-onesignal is installed.');
        return;
      }
      
      console.log('[OneSignal] Constants.expoConfig:', Constants.expoConfig);
      console.log('[OneSignal] Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
      
      // Fallback sur plusieurs sources de config (expoConfig, manifest, easConfig)
      const appId =
        Constants.expoConfig?.extra?.oneSignalAppId ??
        // @ts-ignore
        Constants.manifest?.extra?.oneSignalAppId ??
        // @ts-ignore
        Constants.easConfig?.extra?.oneSignalAppId;

      console.log('[OneSignal] App ID found:', appId);

      if (!appId) {
        console.error('[OneSignal] ❌ App ID not found in Constants config');
        console.error('[OneSignal] expoConfig:', JSON.stringify(Constants.expoConfig, null, 2));
        return;
      }

      // API v5.x : utiliser OneSignal.initialize(appId)
      // @ts-ignore
      if (typeof OneSignal?.initialize !== 'function') {
        console.error('[OneSignal] ❌ initialize() not available. Keys:', Object.keys(OneSignal || {}));
        return;
      }
      console.log('[OneSignal] Calling OneSignal.initialize(appId)...');
      OneSignal.initialize(appId);
      console.log('[OneSignal] ✅ Service initialized with App ID:', appId);

      // Attendre que OneSignal soit complètement prêt avant d'enregistrer les handlers
      // Cela évite les problèmes de timing où les event listeners ne sont pas encore disponibles
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Configurer les handlers de notifications
      OneSignalService.setupNotificationHandlers();
      console.log('[OneSignal] === INIT COMPLETE ===');
    } catch (error) {
      console.error('[OneSignal] ❌ Initialization error:', error);
    }
  },

  /**
   * Obtenir l'état actuel de la permission (utile si l'utilisateur a désactivé dans Réglages)
   */
  getPermissionState: async (): Promise<{ status: string } | null> => {
    try {
      if (!OneSignal?.Notifications?.getPermissionState) {
        console.warn('[OneSignal] getPermissionState not available');
        return null;
      }
      const state = await OneSignal.Notifications.getPermissionState();
      console.log('[OneSignal] Permission state:', state);
      return state as { status: string } | null;
    } catch (error) {
      console.error('[OneSignal] Error getting permission state:', error);
      return null;
    }
  },

  /**
   * Demander la permission iOS UNIQUEMENT (sans identifier l'utilisateur)
   * À appeler sur l'écran onboarding (choix des rôles)
   */
  requestPermission: async () => {
    try {
      console.log('[OneSignal] === REQUEST PERMISSION START ===');
      
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Cannot request permission.');
        return false;
      }
      
      console.log('[OneSignal] Calling OneSignal.Notifications.requestPermission(true)...');
      const result = await OneSignal.Notifications.requestPermission(true);
      console.log('[OneSignal] ✅ Permission result:', result);
      console.log('[OneSignal] === REQUEST PERMISSION COMPLETE ===');
      return result;
    } catch (error) {
      console.error('[OneSignal] ❌ Error requesting permission:', error);
      console.error('[OneSignal] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  },

  /**
   * Identifier l'utilisateur avec son ID Puol
   * À appeler quand l'utilisateur est authentifié (feed ou après login)
   * NOTE: Plan gratuit limité à 2 tags max - on n'ajoute que le tag 'role' ici
   */
  identifyUser: async (userId: string) => {
    console.log('[OneSignal] identifyUser called with userId:', userId);
    try {
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Cannot identify user.');
        return;
      }

      // Identifier l'utilisateur avec son ID Puol
      // Cela lie le device au profil utilisateur
      console.log('[OneSignal] Calling OneSignal.login()...');
      await OneSignal.login(userId);
      console.log('[OneSignal] ✅ User identified (login complete):', userId);

      // Vérifier que l'external ID est bien défini
      let externalId = null;
      let retries = 0;
      while (!externalId && retries < 5) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
          externalId = await OneSignal.User.getExternalId();
          console.log('[OneSignal] External ID confirmed:', externalId);
        } catch (err) {
          retries++;
          console.warn(`[OneSignal] Waiting for external ID (attempt ${retries}/5)...`);
        }
      }

      if (!externalId) {
        console.error('[OneSignal] ❌ External ID not set after login');
      }

      // Délai supplémentaire pour laisser OneSignal synchroniser complètement
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Logger l'ID du device pour vérification
      try {
        const pushSubscriptionId = await OneSignal.User.pushSubscription.getPushSubscriptionId();
        console.log('[OneSignal] Device Push Subscription ID:', pushSubscriptionId);
      } catch (subErr) {
        console.warn('[OneSignal] Could not get push subscription ID:', subErr);
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Error identifying user:', error);
    }
  },

  /**
   * Demander la permission iOS et identifier l'utilisateur
   * À appeler quand l'utilisateur arrive au feed (première page)
   */
  requestPermissionAndIdentifyUser: async (userId: string) => {
    try {
      // Demander la permission iOS
      await OneSignal.Notifications.requestPermission(true);
      console.log('[OneSignal] Permission requested');

      // Identifier l'utilisateur avec son ID Puol
      // Cela lie le device au profil utilisateur
      OneSignal.login(userId);
      console.log('[OneSignal] User identified:', userId);

      // Logger l'ID du device pour vérification
      const pushSubscriptionId = await OneSignal.User.pushSubscription.getPushSubscriptionId();
      console.log('[OneSignal] Device Push Subscription ID:', pushSubscriptionId);
    } catch (error) {
      console.error('[OneSignal] Error requesting permission or identifying user:', error);
    }
  },

  /**
   * Logout utilisateur (quand l'utilisateur se déconnecte)
   */
  logout: async () => {
    try {
      OneSignal.logout();
      console.log('[OneSignal] User logged out');
    } catch (error) {
      console.error('[OneSignal] Error logging out:', error);
    }
  },

  /**
   * Ajouter un tag à l'utilisateur (pour segmentation)
   * IMPORTANT: Plan gratuit limité à 2 tags max
   * Utiliser uniquement 'role' et 'status'
   * Ex: OneSignalService.addTag('role', 'host')
   * Ex: OneSignalService.addTag('status', 'active_booking')
   */
  addTag: async (key: string, value: string) => {
    try {
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Cannot add tag.');
        return;
      }
      OneSignal.User.addTag(key, value);
      console.log('[OneSignal] Tag added:', key, '=', value);
    } catch (error) {
      console.error('[OneSignal] Error adding tag:', error);
    }
  },

  /**
   * Appliquer plusieurs tags en une fois
   * IMPORTANT: OneSignal requires ALL tag values to be strings
   */
  addTags: async (tags: Record<string, string>) => {
    console.log('[OneSignal] addTags called with:', tags);
    try {
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Cannot add tags.');
        return;
      }

      if (!tags || Object.keys(tags).length === 0) {
        console.log('[OneSignal] No tags to apply');
        return;
      }

      // Verify all values are strings
      const allStrings = Object.entries(tags).every(([_, value]) => typeof value === 'string');
      if (!allStrings) {
        console.warn('[OneSignal] ⚠️ WARNING: Not all tag values are strings. Converting...');
        Object.entries(tags).forEach(([key, value]) => {
          if (typeof value !== 'string') {
            console.warn(`[OneSignal] Tag "${key}" is ${typeof value}, converting to string`);
            tags[key] = String(value);
          }
        });
      }

      console.log('[OneSignal] OneSignal.User available:', !!OneSignal.User);
      console.log('[OneSignal] OneSignal.User.addTags type:', typeof OneSignal.User?.addTags);

      if (typeof OneSignal.User?.addTags === 'function') {
        console.log('[OneSignal] Applying tags via addTags()...');
        OneSignal.User.addTags(tags);
        console.log('[OneSignal] ✅ Tags applied:', tags);
        
        // Verify tags were applied
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const appliedTags = await OneSignal.User.getTags();
          console.log('[OneSignal] ✅ Verification - Tags on user:', appliedTags);
        } catch (verifyErr) {
          console.warn('[OneSignal] Could not verify tags:', verifyErr);
        }
      } else {
        console.error('[OneSignal] ❌ addTags not available on OneSignal.User');
        console.error('[OneSignal] Available methods:', Object.keys(OneSignal.User || {}));
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Error applying tags:', error);
    }
  },

  /**
   * Appliquer des attributs (se synchronisent avec le serveur OneSignal)
   * Les attributs sont visibles dans le dashboard OneSignal contrairement aux tags
   */
  addAttributes: async (attributes: Record<string, string | number | boolean>) => {
    console.log('[OneSignal] addAttributes called with:', attributes);
    try {
      if (!OneSignal) {
        console.error('[OneSignal] ❌ OneSignal module not available. Cannot add attributes.');
        return;
      }

      if (!attributes || Object.keys(attributes).length === 0) {
        console.log('[OneSignal] No attributes to apply');
        return;
      }

      console.log('[OneSignal] OneSignal.User available:', !!OneSignal.User);
      console.log('[OneSignal] OneSignal.User keys:', Object.keys(OneSignal.User || {}));

      // Essayer addAttribute directement
      if (typeof OneSignal.User?.addAttribute === 'function') {
        console.log('[OneSignal] Using OneSignal.User.addAttribute...');
        Object.entries(attributes).forEach(([key, value]) => {
          OneSignal.User.addAttribute(key, value);
          console.log('[OneSignal] Attribute added:', key, '=', value);
        });
        console.log('[OneSignal] ✅ Attributes applied via addAttribute:', attributes);
      }
      // Essayer via addTag (fallback - les tags peuvent aussi contenir des attributs)
      else if (typeof OneSignal.User?.addTag === 'function') {
        console.log('[OneSignal] addAttribute not found, using addTag as fallback...');
        Object.entries(attributes).forEach(([key, value]) => {
          OneSignal.User.addTag(key, String(value));
          console.log('[OneSignal] Tag added (attribute fallback):', key, '=', value);
        });
        console.log('[OneSignal] ✅ Attributes applied via addTag (fallback):', attributes);
      }
      // Essayer via setProperty si disponible
      else if (typeof OneSignal.User?.setProperty === 'function') {
        console.log('[OneSignal] Using OneSignal.User.setProperty...');
        Object.entries(attributes).forEach(([key, value]) => {
          OneSignal.User.setProperty(key, value);
          console.log('[OneSignal] Property set:', key, '=', value);
        });
        console.log('[OneSignal] ✅ Attributes applied via setProperty:', attributes);
      }
      else {
        console.error('[OneSignal] ❌ No suitable method found for attributes');
        console.error('[OneSignal] OneSignal.User object:', OneSignal.User);
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Error applying attributes:', error);
    }
  },

  /**
   * Envoyer une notification locale (in-app ou push selon le contexte)
   * À utiliser quand une notification doit être envoyée
   */
  sendNotification: async (params: {
    userId?: string; // ID utilisateur Puol (si présent, envoie push via OneSignal)
    title: string;
    body: string;
    data?: Record<string, string>; // Données additionnelles
  }) => {
    try {
      const { userId, title, body, data } = params;

      if (!userId) {
        console.warn('[OneSignal] No userId provided, notification not sent');
        return;
      }

      // Envoyer via OneSignal API (backend)
      // Cette fonction doit être appelée depuis le backend
      // Pour l'instant, on log juste
      console.log('[OneSignal] Notification to send:', {
        userId,
        title,
        body,
        data,
      });

      // TODO: Appeler le backend pour envoyer la notification
      // POST /api/notifications
      // {
      //   "userId": userId,
      //   "title": title,
      //   "body": body,
      //   "data": data
      // }
    } catch (error) {
      console.error('[OneSignal] Error sending notification:', error);
    }
  },
/**
   * Écouter les notifications reçues
   * ⚠️ IMPORTANT: Cette fonction est appelée APRÈS OneSignal.initialize()
   * donc OneSignal est garantie d'être disponible ici
   */
  setupNotificationHandlers: () => {
    try {
      console.log('[OneSignal] Setting up notification handlers...');

      // Quand une notification est reçue en foreground
      OneSignal.Notifications.addEventListener('foreground', (event: any) => {
        console.log('[OneSignal] Notification received (foreground):', event);
        // Afficher une in-app notification
      });

      // Quand l'utilisateur clique sur une notification
      // ✅ C'est LE handler principal pour la navigation
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        try {
          console.log('[OneSignal] Notification clicked, full event:', JSON.stringify(event, null, 2));

          // Chercher la route dans plusieurs endroits possibles
          let route: string | undefined;
          
          // 1. Essayer additionalData (structure classique)
          if (event?.notification?.additionalData?.route) {
            route = event.notification.additionalData.route;
            console.log('[OneSignal] Route found in additionalData');
          }
          // 2. Essayer data directement
          else if (event?.notification?.data?.route) {
            route = event.notification.data.route;
            console.log('[OneSignal] Route found in data');
          }
          // 3. Essayer au niveau notification
          else if (event?.notification?.route) {
            route = event.notification.route;
            console.log('[OneSignal] Route found in notification');
          }
          // 4. Essayer au niveau event
          else if (event?.route) {
            route = event.route;
            console.log('[OneSignal] Route found in event');
          }

          console.log('[OneSignal] NOTIFICATION_CLICK_DATA:', JSON.stringify(event?.notification, null, 2));
          console.log('[OneSignal] Route from notification:', route);

          // Vérifier que la route est valide avant de naviguer
          if (route && typeof route === 'string' && route.length > 0) {
            console.log('[OneSignal] ✅ Route is valid, will navigate to:', route);
            // La navigation sera gérée par le hook dans _layout.tsx
            // qui écoute les changements de notification
          } else {
            console.warn('[OneSignal] ⚠️ No valid route in notification data');
            console.log('[OneSignal] Available keys in notification:', Object.keys(event?.notification || {}));
          }
        } catch (handlerError) {
          console.error('[OneSignal] Error in notification click handler:', handlerError);
        }
      });

      console.log('[OneSignal] ✅ Notification handlers registered successfully');
    } catch (error) {
      console.error('[OneSignal] Error setting up notification handlers:', error);
    }
  },
};

// Export par défaut pour éviter les imports undefined
export default OneSignalService;
