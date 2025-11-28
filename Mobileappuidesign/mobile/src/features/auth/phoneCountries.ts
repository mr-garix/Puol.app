export type PhoneCountryCode = 'CM' | 'FR';

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

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  {
    code: 'CM',
    name: 'Cameroun',
    flag: '🇨🇲',
    dialCode: '+237',
    inputPlaceholder: '6 XX XX XX XX',
    maxLength: 9,
    minLength: 9,
  },
  {
    code: 'FR',
    name: 'France',
    flag: '🇫🇷',
    dialCode: '+33',
    inputPlaceholder: '06 XX XX XX XX',
    maxLength: 10,
    minLength: 10,
    stripLeadingZero: true,
  },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRY_OPTIONS[0];

export const getPhoneCountryByCode = (code: PhoneCountryCode): PhoneCountryOption => {
  return PHONE_COUNTRY_OPTIONS.find((country) => country.code === code) ?? DEFAULT_PHONE_COUNTRY;
};

export const sanitizeNationalNumber = (value: string, country: PhoneCountryOption) => {
  return value.replace(/\D/g, '').slice(0, country.maxLength);
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
