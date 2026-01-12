export type PhoneCountryCode =
  | 'ZA' // Afrique du Sud
  | 'DZ' // Algérie
  | 'DE' // Allemagne
  | 'AO' // Angola
  | 'BE' // Belgique
  | 'BJ' // Bénin
  | 'BF' // Burkina Faso
  | 'CM' // Cameroun
  | 'CA' // Canada
  | 'CF' // Centrafrique
  | 'CG' // Congo
  | 'CD' // Congo (RDC)
  | 'CI' // Côte d'Ivoire
  | 'CY' // Chypre
  | 'EG' // Égypte
  | 'ES' // Espagne
  | 'US' // États-Unis
  | 'ET' // Éthiopie
  | 'FR' // France
  | 'GA' // Gabon
  | 'GH' // Ghana
  | 'GQ' // Guinée équatoriale
  | 'GN' // Guinée (Conakry)
  | 'GW' // Guinée-Bissau
  | 'GR' // Grèce
  | 'IE' // Irlande
  | 'IT' // Italie
  | 'KE' // Kenya
  | 'LU' // Luxembourg
  | 'ML' // Mali
  | 'MA' // Maroc
  | 'MZ' // Mozambique
  | 'NE' // Niger
  | 'NG' // Nigeria
  | 'NL' // Pays-Bas
  | 'PT' // Portugal
  | 'QA' // Qatar
  | 'RU' // Russie
  | 'SA' // Arabie Saoudite
  | 'SN' // Sénégal
  | 'TZ' // Tanzanie
  | 'TD' // Tchad
  | 'TG' // Togo
  | 'TN' // Tunisie
  | 'TR' // Turquie
  | 'UG' // Ouganda
  | 'AE' // Émirats Arabes Unis
  | 'GB' // Royaume-Uni
  | 'BY'; // Biélorussie

export type PhoneCountryOption = {
  code: PhoneCountryCode;
  name: string;
  flag: string;
  dialCode: string;
  inputPlaceholder: string;
  maxLength: number;
  minLength: number;
  stripLeadingZero?: boolean;
};

const detectSystemCountryCode = (): PhoneCountryCode | null => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    // Exemples : fr-FR, fr_FR, en-US, en_US, fr, fr-CM
    const parts = locale.replace('_', '-').split('-');
    const region = parts.length >= 2 ? parts[1] : parts[0];
    if (!region) return null;
    const upper = region.toUpperCase();
    const match = PHONE_COUNTRY_OPTIONS.find((option) => option.code === upper);
    return match ? match.code : null;
  } catch {
    return null;
  }
};

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: 'ZA', name: 'Afrique du Sud', flag: '🇿🇦', dialCode: '+27', inputPlaceholder: '71 234 5678', maxLength: 9, minLength: 9 },
  { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213', inputPlaceholder: '551 23 45 67', maxLength: 9, minLength: 9 },
  { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49', inputPlaceholder: '0151 2345678', maxLength: 11, minLength: 10, stripLeadingZero: true },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', dialCode: '+244', inputPlaceholder: '923 456 789', maxLength: 9, minLength: 9 },
  { code: 'SA', name: 'Arabie Saoudite', flag: '🇸🇦', dialCode: '+966', inputPlaceholder: '50 1234 5678', maxLength: 9, minLength: 9, stripLeadingZero: true },
  { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32', inputPlaceholder: '04 12 34 56 78', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229', inputPlaceholder: '90 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226', inputPlaceholder: '70 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'BY', name: 'Biélorussie', flag: '🇧🇾', dialCode: '+375', inputPlaceholder: '29 1234 5678', maxLength: 9, minLength: 9, stripLeadingZero: true },
  { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237', inputPlaceholder: '6 XX XX XX XX', maxLength: 9, minLength: 9 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', inputPlaceholder: '514 123 4567', maxLength: 10, minLength: 10 },
  { code: 'CF', name: 'Centrafrique', flag: '🇨🇫', dialCode: '+236', inputPlaceholder: '70 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242', inputPlaceholder: '06 123 4567', maxLength: 9, minLength: 9 },
  { code: 'CD', name: 'Congo (RDC)', flag: '🇨🇩', dialCode: '+243', inputPlaceholder: '81 234 5678', maxLength: 9, minLength: 9 },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225', inputPlaceholder: '07 07 07 07 07', maxLength: 10, minLength: 10 },
  { code: 'CY', name: 'Chypre', flag: '🇨🇾', dialCode: '+357', inputPlaceholder: '96 123 456', maxLength: 8, minLength: 8 },
  { code: 'EG', name: 'Égypte', flag: '🇪🇬', dialCode: '+20', inputPlaceholder: '0100 123 4567', maxLength: 10, minLength: 10 },
  { code: 'AE', name: 'Émirats Arabes Unis', flag: '🇦🇪', dialCode: '+971', inputPlaceholder: '50 1234 5678', maxLength: 9, minLength: 9, stripLeadingZero: true },
  { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34', inputPlaceholder: '612 345 678', maxLength: 9, minLength: 9 },
  { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1', inputPlaceholder: '202 555 0123', maxLength: 10, minLength: 10 },
  { code: 'ET', name: 'Éthiopie', flag: '🇪🇹', dialCode: '+251', inputPlaceholder: '91 234 5678', maxLength: 9, minLength: 9 },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', inputPlaceholder: '06 XX XX XX XX', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241', inputPlaceholder: '06 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233', inputPlaceholder: '02 34 56 78 90', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'GQ', name: 'Guinée équatoriale', flag: '🇬🇶', dialCode: '+240', inputPlaceholder: '222 123 456', maxLength: 9, minLength: 9 },
  { code: 'GN', name: 'Guinée (Conakry)', flag: '🇬🇳', dialCode: '+224', inputPlaceholder: '621 123 456', maxLength: 9, minLength: 9 },
  { code: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245', inputPlaceholder: '955 123 456', maxLength: 9, minLength: 9 },
  { code: 'GR', name: 'Grèce', flag: '🇬🇷', dialCode: '+30', inputPlaceholder: '69 1234 5678', maxLength: 10, minLength: 10 },
  { code: 'IE', name: 'Irlande', flag: '🇮🇪', dialCode: '+353', inputPlaceholder: '08 7123 4567', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39', inputPlaceholder: '312 345 6789', maxLength: 10, minLength: 9 },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', dialCode: '+254', inputPlaceholder: '712 345 678', maxLength: 9, minLength: 9 },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', dialCode: '+352', inputPlaceholder: '621 234 567', maxLength: 9, minLength: 9 },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223', inputPlaceholder: '65 12 34 56', maxLength: 8, minLength: 8 },
  { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212', inputPlaceholder: '06 12 34 56 78', maxLength: 9, minLength: 9, stripLeadingZero: true },
  { code: 'MZ', name: 'Mozambique', flag: '🇲🇿', dialCode: '+258', inputPlaceholder: '84 123 4567', maxLength: 9, minLength: 9 },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227', inputPlaceholder: '90 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', dialCode: '+234', inputPlaceholder: '0802 123 4567', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'NL', name: 'Pays-Bas', flag: '🇳🇱', dialCode: '+31', inputPlaceholder: '06 12 34 56 78', maxLength: 10, minLength: 10, stripLeadingZero: true },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351', inputPlaceholder: '91 234 5678', maxLength: 9, minLength: 9 },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', dialCode: '+974', inputPlaceholder: '3312 3456', maxLength: 8, minLength: 8 },
  { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44', inputPlaceholder: '07911 123456', maxLength: 11, minLength: 10, stripLeadingZero: true },
  { code: 'RU', name: 'Russie', flag: '🇷🇺', dialCode: '+7', inputPlaceholder: '912 345 6789', maxLength: 10, minLength: 10 },
  { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221', inputPlaceholder: '77 123 4567', maxLength: 9, minLength: 9 },
  { code: 'TZ', name: 'Tanzanie', flag: '🇹🇿', dialCode: '+255', inputPlaceholder: '07 12 34 56 78', maxLength: 9, minLength: 9, stripLeadingZero: true },
  { code: 'TD', name: 'Tchad', flag: '🇹🇩', dialCode: '+235', inputPlaceholder: '60 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228', inputPlaceholder: '90 00 00 00', maxLength: 8, minLength: 8 },
  { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216', inputPlaceholder: '20 000 000', maxLength: 8, minLength: 8 },
  { code: 'TR', name: 'Turquie', flag: '🇹🇷', dialCode: '+90', inputPlaceholder: '501 234 5678', maxLength: 10, minLength: 10 },
  { code: 'UG', name: 'Ouganda', flag: '🇺🇬', dialCode: '+256', inputPlaceholder: '712 345 678', maxLength: 9, minLength: 9 },
];

const FALLBACK_COUNTRY_CODE: PhoneCountryCode = 'CM';

export const DEFAULT_PHONE_COUNTRY =
  PHONE_COUNTRY_OPTIONS.find((country) => country.code === detectSystemCountryCode()) ??
  PHONE_COUNTRY_OPTIONS.find((country) => country.code === FALLBACK_COUNTRY_CODE) ??
  PHONE_COUNTRY_OPTIONS[0];

export const getPhoneCountryByCode = (code: PhoneCountryCode): PhoneCountryOption => {
  return PHONE_COUNTRY_OPTIONS.find((country) => country.code === code) ?? DEFAULT_PHONE_COUNTRY;
};

export const sanitizeNationalNumber = (value: string, country: PhoneCountryOption) => {
  let digits = value.replace(/\D/g, '');
  
  // Si l'utilisateur a collé un numéro avec le préfixe du pays, on le supprime
  const dialCodeDigits = country.dialCode.replace(/\D/g, '');
  if (digits.startsWith(dialCodeDigits)) {
    digits = digits.slice(dialCodeDigits.length);
  }
  
  return digits.slice(0, country.maxLength);
};

export const formatE164PhoneNumber = (nationalNumber: string, country: PhoneCountryOption) => {
  if (!nationalNumber) return '';

  let digits = nationalNumber;
  if (country.stripLeadingZero && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  if (!digits) return '';

  return `${country.dialCode}${digits}`;
};

export const parseE164PhoneNumber = (phoneE164: string) => {
  if (!phoneE164) {
    return {
      country: DEFAULT_PHONE_COUNTRY,
      nationalNumber: '',
    };
  }

  const country =
    PHONE_COUNTRY_OPTIONS.find((option) => phoneE164.startsWith(option.dialCode)) ?? DEFAULT_PHONE_COUNTRY;

  let nationalDigits = phoneE164.slice(country.dialCode.length);
  if (country.stripLeadingZero && nationalDigits) {
    nationalDigits = `0${nationalDigits}`;
  }

  return {
    country,
    nationalNumber: sanitizeNationalNumber(nationalDigits, country),
  };
};
