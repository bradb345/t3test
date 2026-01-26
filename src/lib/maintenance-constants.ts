import { Clock, Wrench, CheckCircle2 } from "lucide-react";

/**
 * Shared configuration for maintenance request statuses
 * Used across RecentMaintenanceCard and MaintenanceRequestCard components
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
 * Priority configuration for maintenance requests (simple variant)
 * Used in RecentMaintenanceCard for compact display
 */
export const maintenancePriorityConfig = {
  low: { label: "Low", className: "text-green-600" },
  medium: { label: "Medium", className: "text-yellow-600" },
  high: { label: "High", className: "text-orange-600" },
  emergency: { label: "Emergency", className: "text-red-600" },
};

/**
 * Priority configuration for maintenance requests (detailed variant)
 * Used in MaintenanceRequestCard for badge-style display with dark mode support
 */
export const maintenancePriorityBadgeConfig = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  emergency: { label: "Emergency", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

/**
 * Category labels for maintenance requests
 */
export const maintenanceCategoryLabels: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  appliance: "Appliance",
  structural: "Structural",
  pest: "Pest Control",
  other: "Other",
};

// Type exports for use in components
export type MaintenanceStatus = keyof typeof maintenanceStatusConfig;
export type MaintenancePriority = keyof typeof maintenancePriorityConfig;
export type MaintenanceCategory = keyof typeof maintenanceCategoryLabels;
