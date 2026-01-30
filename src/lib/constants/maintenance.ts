/**
 * Shared maintenance request constants for categories and priorities.
 * Used by both frontend components and backend API validation.
 */

export const MAINTENANCE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC / Heating / Cooling" },
  { value: "appliance", label: "Appliance" },
  { value: "structural", label: "Structural" },
  { value: "pest", label: "Pest Control" },
  { value: "other", label: "Other" },
] as const;

export const MAINTENANCE_PRIORITIES = [
  { value: "low", label: "Low", description: "Can wait a few weeks" },
  { value: "medium", label: "Medium", description: "Should be addressed soon" },
  { value: "high", label: "High", description: "Needs attention within days" },
  {
    value: "emergency",
    label: "Emergency",
    description: "Urgent - safety concern",
  },
] as const;

// Type definitions derived from constants
export type MaintenanceCategory =
  (typeof MAINTENANCE_CATEGORIES)[number]["value"];
export type MaintenancePriority =
  (typeof MAINTENANCE_PRIORITIES)[number]["value"];

// Extracted values for validation (as mutable string arrays for .includes() compatibility)
export const VALID_MAINTENANCE_CATEGORIES = MAINTENANCE_CATEGORIES.map(
  (c) => c.value
) as string[];
export const VALID_MAINTENANCE_PRIORITIES = MAINTENANCE_PRIORITIES.map(
  (p) => p.value
) as string[];

// Maintenance statuses
export const MAINTENANCE_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]["value"];

export const VALID_MAINTENANCE_STATUSES = MAINTENANCE_STATUSES.map(
  (s) => s.value
) as string[];

// Valid status transitions for landlords
export const MAINTENANCE_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "pending", "cancelled"],
  completed: [],
  cancelled: ["pending"],
};

// --- UI config (previously in src/lib/maintenance-constants.ts) ---

import { Clock, Wrench, CheckCircle2 } from "lucide-react";

/**
 * Status configuration for UI display (icons, variants, descriptions)
 */
export const maintenanceStatusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    description: "Awaiting review",
  },
  in_progress: {
    label: "In Progress",
    variant: "default" as const,
    icon: Wrench,
    description: "Being worked on",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    icon: CheckCircle2,
    description: "Issue resolved",
  },
};

/**
 * Priority configuration for compact display
 */
export const maintenancePriorityConfig = {
  low: { label: "Low", className: "text-green-600" },
  medium: { label: "Medium", className: "text-yellow-600" },
  high: { label: "High", className: "text-orange-600" },
  emergency: { label: "Emergency", className: "text-red-600" },
};

/**
 * Priority configuration for badge-style display with dark mode support
 */
export const maintenancePriorityBadgeConfig = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  emergency: { label: "Emergency", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

/**
 * Category labels derived from MAINTENANCE_CATEGORIES
 */
export const maintenanceCategoryLabels: Record<string, string> =
  Object.fromEntries(MAINTENANCE_CATEGORIES.map((c) => [c.value, c.label]));
