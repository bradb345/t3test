/**
 * Currency Detection Utility
 * 
 * This module determines which currency to use based on property coordinates.
 * It checks if the property location falls within any supported country's boundaries.
 */

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { SUPPORTED_COUNTRIES, DEFAULT_CURRENCY, type Currency } from "./config";

/**
 * Detects the appropriate currency for a property based on its coordinates
 * 
 * @param latitude - Property latitude
 * @param longitude - Property longitude
 * @returns Currency object (defaults to USD if not in supported region)
 * 
 * @example
 * ```ts
 * const currency = detectCurrencyFromCoordinates(19.3, -81.4);
 * console.log(currency.code); // "KYD"
 * ```
 */
export function detectCurrencyFromCoordinates(
  latitude: number,
  longitude: number
): Currency {
  // Create a point from the property coordinates
  const propertyPoint = point([longitude, latitude]);

  // Check each supported country
  for (const country of SUPPORTED_COUNTRIES) {
    // Create a polygon from the country's boundary coordinates
    const countryPolygon = polygon([country.polygon]);

    // Check if the property point is within the country's polygon
    if (booleanPointInPolygon(propertyPoint, countryPolygon)) {
      return country.currency;
    }
  }

  // If not in any supported country, return default currency
  return DEFAULT_CURRENCY;
}

/**
 * Gets the country code for a property based on its coordinates
 * 
 * @param latitude - Property latitude
 * @param longitude - Property longitude
 * @returns Country code (e.g., "KY") or null if not in supported region
 */
export function detectCountryFromCoordinates(
  latitude: number,
  longitude: number
): string | null {
  const propertyPoint = point([longitude, latitude]);

  for (const country of SUPPORTED_COUNTRIES) {
    const countryPolygon = polygon([country.polygon]);

    if (booleanPointInPolygon(propertyPoint, countryPolygon)) {
      return country.code;
    }
  }

  return null;
}

/**
 * Validates if coordinates are within a supported country
 * 
 * @param latitude - Property latitude
 * @param longitude - Property longitude
 * @returns true if within any supported country, false otherwise
 */
export function isInSupportedCountry(
  latitude: number,
  longitude: number
): boolean {
  return detectCountryFromCoordinates(latitude, longitude) !== null;
}

/**
 * Gets full country and currency information for coordinates
 * 
 * @param latitude - Property latitude
 * @param longitude - Property longitude
 * @returns Object with country info and currency, or null if not in supported region
 */
export function getLocationInfo(latitude: number, longitude: number): {
  countryCode: string;
  countryName: string;
  currency: Currency;
} | null {
  const propertyPoint = point([longitude, latitude]);

  for (const country of SUPPORTED_COUNTRIES) {
    const countryPolygon = polygon([country.polygon]);

    if (booleanPointInPolygon(propertyPoint, countryPolygon)) {
      return {
        countryCode: country.code,
        countryName: country.name,
        currency: country.currency,
      };
    }
  }

  return null;
}
