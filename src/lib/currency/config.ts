/**
 * Currency Configuration
 * 
 * This module defines supported countries, their currencies, and geographic boundaries.
 * When a property is created, we check if its coordinates fall within any supported
 * country's boundaries. If yes, we use that country's currency. Otherwise, we default to USD.
 */

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimalPlaces: number;
}

export interface SupportedCountry {
  code: string;
  name: string;
  currency: Currency;
  /**
   * Polygon coordinates defining the country's boundaries
   * Format: [longitude, latitude] pairs forming a closed polygon
   */
  polygon: number[][];
}

/**
 * Currency definitions
 */
export const CURRENCIES: Record<string, Currency> = {
  KYD: {
    code: "KYD",
    symbol: "CI$",
    name: "Cayman Islands Dollar",
    decimalPlaces: 2,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    decimalPlaces: 2,
  },
} as const;

/**
 * Default currency to use when property is outside supported regions
 */
export const DEFAULT_CURRENCY: Currency = CURRENCIES.KYD!;

/**
 * Supported countries with their geographic boundaries
 * 
 * Cayman Islands consists of three islands:
 * - Grand Cayman (largest)
 * - Cayman Brac
 * - Little Cayman
 * 
 * The polygon below encompasses all three islands with some buffer.
 */
export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
    code: "KY",
    name: "Cayman Islands",
    currency: CURRENCIES.KYD!,
    polygon: [
      // Grand Cayman - approximate bounding polygon
      [-81.43, 19.25],   // Northwest corner
      [-81.05, 19.25],   // Northeast corner
      [-81.05, 19.20],   // East point
      [-81.10, 19.15],   // Southeast corner
      [-81.43, 19.15],   // Southwest corner
      [-81.43, 19.25],   // Close polygon (back to start)
    ],
  },
  // Add more countries here in the future, e.g.:
  // {
  //   code: "GB",
  //   name: "United Kingdom",
  //   currency: CURRENCIES.GBP,
  //   polygon: [...],
  // },
];

/**
 * Get all supported currency codes
 */
export function getSupportedCurrencyCodes(): string[] {
  return Object.keys(CURRENCIES);
}

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return CURRENCIES[code];
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCIES;
}
