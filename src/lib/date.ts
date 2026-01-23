/**
 * Date Formatting Utility
 *
 * This module provides consistent date formatting across the application using Luxon.
 * Luxon is a modern, immutable date/time library for JavaScript.
 *
 * Usage:
 * ```ts
 * import { formatDate, formatDateShort, formatRelativeDate, getDaysUntil } from "~/lib/date";
 *
 * formatDate(new Date()) // "Jan 23, 2026"
 * formatDateShort(new Date()) // "Jan 23"
 * formatRelativeDate(new Date()) // "today" or "in 5 days"
 * getDaysUntil(new Date()) // 5
 * ```
 */

import { DateTime } from "luxon";

/**
 * Formats a date to a standard display format (e.g., "Jan 23, 2026")
 *
 * @param date - The date to format (Date, string, or null)
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date("2026-01-23")) // "Jan 23, 2026"
 * formatDate("2026-01-23T00:00:00.000Z") // "Jan 23, 2026"
 * ```
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return "";

  return dt.toFormat("MMM d, yyyy");
}

/**
 * Formats a date to a short format without year (e.g., "Jan 23")
 *
 * @param date - The date to format (Date, string, or null)
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDateShort(new Date("2026-01-23")) // "Jan 23"
 * ```
 */
export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return "";

  return dt.toFormat("MMM d");
}

/**
 * Formats a date with full month name (e.g., "January 23, 2026")
 *
 * @param date - The date to format (Date, string, or null)
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDateLong(new Date("2026-01-23")) // "January 23, 2026"
 * ```
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return "";

  return dt.toFormat("MMMM d, yyyy");
}

/**
 * Formats a date and time (e.g., "Jan 23, 2026 at 3:45 PM")
 *
 * @param date - The date to format (Date, string, or null)
 * @returns Formatted date and time string
 *
 * @example
 * ```ts
 * formatDateTime(new Date("2026-01-23T15:45:00")) // "Jan 23, 2026 at 3:45 PM"
 * ```
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return "";

  return dt.toFormat("MMM d, yyyy 'at' h:mm a");
}

/**
 * Returns a relative date string (e.g., "today", "yesterday", "in 5 days", "5 days ago")
 *
 * @param date - The date to compare (Date, string, or null)
 * @returns Relative date string
 *
 * @example
 * ```ts
 * formatRelativeDate(new Date()) // "today"
 * formatRelativeDate(tomorrow) // "in 1 day"
 * formatRelativeDate(yesterday) // "1 day ago"
 * ```
 */
export function formatRelativeDate(
  date: Date | string | null | undefined
): string {
  if (!date) return "";

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return "";

  return dt.toRelative() ?? "";
}

/**
 * Calculates the number of days until a given date
 *
 * @param date - The target date (Date, string, or null)
 * @returns Number of days until the date (negative if in the past)
 *
 * @example
 * ```ts
 * getDaysUntil(new Date("2026-01-28")) // 5 (if today is Jan 23)
 * getDaysUntil(new Date("2026-01-18")) // -5 (if today is Jan 23)
 * ```
 */
export function getDaysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return 0;

  const now = DateTime.now();
  const diff = dt.startOf("day").diff(now.startOf("day"), "days");

  return Math.round(diff.days);
}

/**
 * Checks if a date is in the past
 *
 * @param date - The date to check (Date, string, or null)
 * @returns True if the date is in the past
 *
 * @example
 * ```ts
 * isDateInPast(new Date("2020-01-01")) // true
 * isDateInPast(new Date("2030-01-01")) // false
 * ```
 */
export function isDateInPast(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return false;

  return dt < DateTime.now();
}

/**
 * Checks if a date is today
 *
 * @param date - The date to check (Date, string, or null)
 * @returns True if the date is today
 *
 * @example
 * ```ts
 * isToday(new Date()) // true
 * ```
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dt =
    typeof date === "string" ? DateTime.fromISO(date) : DateTime.fromJSDate(date);

  if (!dt.isValid) return false;

  return dt.hasSame(DateTime.now(), "day");
}

/**
 * Formats a date range (e.g., "Jan 1, 2026 - Dec 31, 2026")
 *
 * @param startDate - The start date (Date, string, or null)
 * @param endDate - The end date (Date, string, or null)
 * @returns Formatted date range string
 *
 * @example
 * ```ts
 * formatDateRange(new Date("2026-01-01"), new Date("2026-12-31"))
 * // "Jan 1, 2026 - Dec 31, 2026"
 * ```
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;

  return `${start} - ${end}`;
}
