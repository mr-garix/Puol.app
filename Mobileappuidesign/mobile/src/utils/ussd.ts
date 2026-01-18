import { Linking, Platform } from 'react-native';

/**
 * Extrait la commande USSD d'un message de confirmation
 * Ex: "Dial #150*50#" → "#150*50#"
 * Ex: "Confirm by dialing *150*50#" → "*150*50#"
 */
export const extractUssdCommand = (message: string): string | null => {
  if (!message) return null;

  console.log('[extractUssdCommand] Message reçu:', message);

  // Regex pour détecter les patterns USSD
  // Cherche : *digits*digits*...# ou #digits*digits*...#
  const ussdRegex = /(\*[\d\*]+#|#[\d\*]+#)/;
  const match = message.match(ussdRegex);

  console.log('[extractUssdCommand] Match trouvé:', match?.[1] || 'aucun');

  if (match && match[1]) {
    return match[1];
  }

  return null;
};

/**
 * Ouvre le dialer USSD avec le numéro prérempli
 * Android : ouvre le dialer avec le code USSD
 * iOS : ouvre le dialer avec le code USSD
 */
export const openUssd = async (confirmMessage: string): Promise<{ success: boolean; ussdCommand: string | null }> => {
  try {
    const ussdCommand = extractUssdCommand(confirmMessage);

    if (!ussdCommand) {
      console.warn('[openUssd] ⚠️ Aucune commande USSD trouvée dans:', confirmMessage);
      return { success: false, ussdCommand: null };
    }

    console.log('[openUssd] 📞 Commande USSD détectée:', ussdCommand);

    // Encoder le # en %23 pour l'URL
    const encodedUssd = ussdCommand.replace(/#/g, '%23');
    const telUrl = `tel:${encodedUssd}`;

    console.log('[openUssd] 📱 Plateforme:', Platform.OS);
    console.log('[openUssd] 🔗 URL à ouvrir:', telUrl);

    // Vérifier que l'URL peut être ouverte
    const canOpen = await Linking.canOpenURL(telUrl);
    console.log('[openUssd] ✓ Peut ouvrir URL:', canOpen);

    if (canOpen) {
      await Linking.openURL(telUrl);
      console.log('[openUssd] ✅ Dialer ouvert avec:', ussdCommand);
      return { success: true, ussdCommand };
    } else {
      console.warn('[openUssd] ⚠️ Impossible d\'ouvrir l\'URL, tentative fallback');
      // Fallback : essayer sans encodage
      try {
        await Linking.openURL(`tel:${ussdCommand}`);
        console.log('[openUssd] ✅ Fallback réussi');
        return { success: true, ussdCommand };
      } catch (fallbackError) {
        console.error('[openUssd] ❌ Fallback échoué:', fallbackError);
        return { success: false, ussdCommand };
      }
    }
  } catch (error) {
    console.error('[openUssd] ❌ Erreur:', error);
    return { success: false, ussdCommand: null };
  }
};
