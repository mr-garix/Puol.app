import { useCallback, useRef, useEffect } from 'react';
import { Clipboard } from 'react-native';

interface UseOtpAutocompleteProps {
  onOtpDetected: (otp: string) => void;
  enabled?: boolean;
}

/**
 * Hook pour détecter et remplir automatiquement le code OTP depuis le presse-papiers
 * Quand l'utilisateur clique sur le champ OTP, on essaie de lire le code depuis le presse-papiers
 */
export const useOtpAutocomplete = ({ onOtpDetected, enabled = true }: UseOtpAutocompleteProps) => {
  const onOtpDetectedRef = useRef(onOtpDetected);

  useEffect(() => {
    onOtpDetectedRef.current = onOtpDetected;
  }, [onOtpDetected]);

  const detectOtpFromClipboard = useCallback(async () => {
    if (!enabled) return;

    try {
      const clipboardContent = await Clipboard.getString();
      
      if (!clipboardContent) {
        console.log('[useOtpAutocomplete] Presse-papiers vide');
        return;
      }

      // Extraire les 6 premiers chiffres du contenu du presse-papiers
      const otpMatch = clipboardContent.match(/\d{6}/);
      
      if (otpMatch) {
        const otp = otpMatch[0];
        console.log('[useOtpAutocomplete] ✅ Code OTP détecté depuis le presse-papiers:', otp);
        onOtpDetectedRef.current(otp);
      } else {
        console.log('[useOtpAutocomplete] Aucun code OTP valide trouvé dans le presse-papiers');
      }
    } catch (error) {
      console.error('[useOtpAutocomplete] Erreur lors de la lecture du presse-papiers:', error);
    }
  }, [enabled]);

  return { detectOtpFromClipboard };
};
