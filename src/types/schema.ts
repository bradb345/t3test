/**
 * Shared base types inferred from the database schema.
 * Import these instead of redeclaring in individual type files.
 */

import type {
  user,
  leases,
  units,
  properties,
  payments,
  maintenanceRequests,
  tenantDocuments,
} from "~/server/db/schema";

export type User = typeof user.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type TenantDocument = typeof tenantDocuments.$inferSelect;
