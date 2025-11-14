/**
 * Currency Formatting Utility
 * 
 * This module provides consistent currency formatting across the application.
 */

import { getCurrency, DEFAULT_CURRENCY, type Currency } from "./config";

/**
 * Formats a monetary amount with the appropriate currency symbol and formatting
 * 
 * @param amount - The amount to format (can be number, string, or null)
 * @param currencyCode - The currency code (e.g., "USD", "KYD")
 * @param options - Additional formatting options
 * @returns Formatted currency string
 * 
 * @example
 * ```ts
 * formatCurrency(1500, "USD") // "$1,500.00"
 * formatCurrency(1500, "KYD") // "CI$1,500.00"
 * formatCurrency(1500.5, "USD", { compact: true }) // "$1.5K"
 * ```
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode: string,
  options: {
    compact?: boolean;
    showSymbol?: boolean;
    showCode?: boolean;
  } = {}
): string {
  const {
    compact = false,
    showSymbol = true,
    showCode = false,
  } = options;

  // Handle null/undefined amounts
  if (amount === null || amount === undefined) {
    const currency = getCurrency(currencyCode) ?? DEFAULT_CURRENCY;
    return showSymbol ? `${currency.symbol}0` : "0";
  }

  // Convert string to number if needed
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Validate amount
  if (isNaN(numAmount)) {
    const currency = getCurrency(currencyCode) ?? DEFAULT_CURRENCY;
    return showSymbol ? `${currency.symbol}0` : "0";
  }

  // Get currency configuration
  const currency = getCurrency(currencyCode) ?? DEFAULT_CURRENCY;

  // Format based on options
  if (compact && numAmount >= 1000) {
    return formatCompactCurrency(numAmount, currency, showSymbol);
  }

  // Standard formatting
  const formatted = numAmount.toLocaleString("en-US", {
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces,
  });

  // Build output string
  let result = "";
  if (showSymbol) {
    result = `${currency.symbol}${formatted}`;
  } else {
    result = formatted;
  }

  if (showCode) {
    result = `${result} ${currency.code}`;
  }

  return result;
}

/**
 * Formats currency in compact notation (e.g., 1.5K, 2M)
 */
function formatCompactCurrency(
  amount: number,
  currency: Currency,
  showSymbol: boolean
): string {
  const symbol = showSymbol ? currency.symbol : "";

  if (amount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }

  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }

  return `${symbol}${amount.toFixed(currency.decimalPlaces)}`;
}

/**
 * Formats a currency amount for display in forms/inputs (without symbol)
 * 
 * @param amount - The amount to format
 * @param currencyCode - The currency code
 * @returns Formatted amount without symbol
 */
export function formatCurrencyForInput(
  amount: number | string | null | undefined,
  currencyCode: string
): string {
  return formatCurrency(amount, currencyCode, {
    showSymbol: false,
    showCode: false,
  });
}

/**
 * Formats a currency range (e.g., for rent ranges)
 * 
 * @param min - Minimum amount
 * @param max - Maximum amount
 * @param currencyCode - The currency code
 * @returns Formatted range string
 * 
 * @example
 * ```ts
 * formatCurrencyRange(1000, 2000, "USD") // "$1,000 - $2,000"
 * ```
 */
export function formatCurrencyRange(
  min: number,
  max: number,
  currencyCode: string
): string {
  const currency = getCurrency(currencyCode) ?? DEFAULT_CURRENCY;
  const minFormatted = formatCurrency(min, currencyCode);
  const maxFormatted = formatCurrency(max, currencyCode, {
    showSymbol: false,
  });

  return `${minFormatted} - ${currency.symbol}${maxFormatted}`;
}

/**
 * Parses a currency string to a number
 * Removes currency symbols and formatting
 * 
 * @param value - The formatted currency string
 * @returns Parsed number or null if invalid
 * 
 * @example
 * ```ts
 * parseCurrency("$1,500.00") // 1500
 * parseCurrency("CI$2,000") // 2000
 * ```
 */
export function parseCurrency(value: string): number | null {
  if (!value) return null;

  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = value.replace(/[^0-9.-]/g, "");

  // Validate: only one decimal point, minus sign only at the start (if present)
  if ((cleaned.match(/\./g) || []).length > 1 || (cleaned.indexOf('-') > 0) || (cleaned.split('-').length > 2)) {
    return null;
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Gets the currency symbol for a currency code
 * 
 * @param currencyCode - The currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const currency = getCurrency(currencyCode) ?? DEFAULT_CURRENCY;
  return currency.symbol;
}

/**
 * Formats monthly rent display
 * 
 * @param amount - Monthly rent amount
 * @param currencyCode - The currency code
 * @returns Formatted rent string with "/month" suffix
 */
export function formatMonthlyRent(
  amount: number | string | null | undefined,
  currencyCode: string
): string {
  const formatted = formatCurrency(amount, currencyCode);
  return `${formatted}/month`;
}

/**
 * Validates if a currency amount is valid
 * 
 * @param amount - The amount to validate
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (optional)
 * @returns true if valid, false otherwise
 */
export function isValidCurrencyAmount(
  amount: number,
  min = 0,
  max?: number
): boolean {
  if (isNaN(amount)) return false;
  if (amount < min) return false;
  if (max !== undefined && amount > max) return false;
  return true;
}
