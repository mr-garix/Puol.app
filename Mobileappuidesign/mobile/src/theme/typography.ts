import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Réduction uniquement sous la référence iPhone 16 Pro (~393‑430pt). Au-dessus, on laisse à 1.
export const FONT_SCALE =
  width <= 360 ? 0.85 : // petits écrans (ex : iPhone SE / petits Android)
  width <= 390 ? 0.92 : // mini / compacts
  width <= 430 ? 1 : // référence 16 Pro / 16 Pro Max
  1; // grands formats : pas d’agrandissement pour préserver les proportions actuelles

export function scaleFont(base: number): number {
  return Math.round(base * FONT_SCALE);
}

export const Typography = {
  titleXL: { fontSize: scaleFont(32), lineHeight: scaleFont(38) },
  titleL: { fontSize: scaleFont(28), lineHeight: scaleFont(34) },
  titleM: { fontSize: scaleFont(24), lineHeight: scaleFont(30) },
  body: { fontSize: scaleFont(16), lineHeight: scaleFont(24) },
  small: { fontSize: scaleFont(14), lineHeight: scaleFont(20) },
  caption: { fontSize: scaleFont(12), lineHeight: scaleFont(18) },
};
