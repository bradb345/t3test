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
