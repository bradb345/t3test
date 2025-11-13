/**
 * Currency Management System
 * 
 * This module provides comprehensive currency handling for the rental platform.
 * 
 * Features:
 * - Automatic currency detection based on property coordinates
 * - Support for multiple currencies (currently USD and KYD)
 * - Consistent formatting across the application
 * - Easy to extend with additional countries/currencies
 * 
 * Usage:
 * ```ts
 * import { detectCurrencyFromCoordinates, formatCurrency } from "~/lib/currency";
 * 
 * const currency = detectCurrencyFromCoordinates(19.3, -81.4);
 * const formatted = formatCurrency(1500, currency.code); // "CI$1,500.00"
 * ```
 */

// Export configuration
export {
  CURRENCIES,
  DEFAULT_CURRENCY,
  SUPPORTED_COUNTRIES,
  getSupportedCurrencyCodes,
  getCurrency,
  isSupportedCurrency,
  type Currency,
  type SupportedCountry,
} from "./config";

// Export detection utilities
export {
  detectCurrencyFromCoordinates,
  detectCountryFromCoordinates,
  isInSupportedCountry,
  getLocationInfo,
} from "./detector";

// Export formatting utilities
export {
  formatCurrency,
  formatCurrencyForInput,
  formatCurrencyRange,
  formatMonthlyRent,
  parseCurrency,
  getCurrencySymbol,
  isValidCurrencyAmount,
} from "./formatter";
