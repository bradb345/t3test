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
export const DEFAULT_CURRENCY: Currency = CURRENCIES.USD!;

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
 * Extended polygon for all Cayman Islands with more detailed boundaries
 * This includes Grand Cayman, Cayman Brac, and Little Cayman
 */
export const CAYMAN_ISLANDS_DETAILED_POLYGON = [
  // Grand Cayman (main island) - clockwise from northwest
  [-81.432, 19.366],
  [-81.402, 19.375],
  [-81.370, 19.375],
  [-81.340, 19.370],
  [-81.310, 19.360],
  [-81.280, 19.350],
  [-81.250, 19.335],
  [-81.220, 19.320],
  [-81.200, 19.305],
  [-81.180, 19.288],
  [-81.165, 19.270],
  [-81.155, 19.250],
  [-81.150, 19.230],
  [-81.150, 19.210],
  [-81.155, 19.190],
  [-81.165, 19.175],
  [-81.180, 19.165],
  [-81.200, 19.160],
  [-81.220, 19.160],
  [-81.240, 19.165],
  [-81.260, 19.175],
  [-81.280, 19.185],
  [-81.300, 19.195],
  [-81.320, 19.205],
  [-81.340, 19.215],
  [-81.360, 19.225],
  [-81.380, 19.240],
  [-81.400, 19.255],
  [-81.415, 19.275],
  [-81.425, 19.295],
  [-81.432, 19.315],
  [-81.435, 19.335],
  [-81.432, 19.355],
  [-81.432, 19.366], // Close polygon
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
