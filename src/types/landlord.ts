/**
 * Shared type definitions for landlord dashboard components
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

// Base types from schema
export type User = typeof user.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type TenantDocument = typeof tenantDocuments.$inferSelect;

// Extended types with relations
export interface PropertyWithUnits extends Property {
  units: Unit[];
}

export interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
  tenant: User;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  unit: Unit;
  property: Property;
  tenant: User;
}

export interface TenantWithLease {
  user: User;
  lease: Lease;
  unit: Unit;
  property: Property;
}

export interface PaymentWithDetails extends Payment {
  tenant: User;
  lease: Lease;
  unit: Unit;
  property: Property;
}

export interface DocumentWithDetails extends TenantDocument {
  tenant: User;
  unit: Unit | null;
  property: Property | null;
}

// Stats for overview
export interface LandlordStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  pendingMaintenance: number;
  upcomingExpirations: number;
  currency: string;
}

// Lease expiration info
export interface LeaseExpiration {
  leaseId: number;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  expirationDate: Date;
  daysUntilExpiration: number;
}

// Dashboard data passed from server to client
export interface LandlordDashboardData {
  user: User;
  properties: PropertyWithUnits[];
  stats: LandlordStats;
  leaseExpirations: LeaseExpiration[];
}

// Viewing request types (for inquiries tab)
export interface ViewingRequest {
  id: number;
  unitId: number;
  name: string;
  email: string;
  phone: string | null;
  preferredDate: Date | null;
  preferredTime: string | null;
  message: string | null;
  status: "pending" | "approved" | "declined" | "completed";
  landlordNotes: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ViewingRequestWithDetails extends ViewingRequest {
  unit: Unit;
  property: Property;
}

// Tab values for URL query params
export type LandlordDashboardTab =
  | "overview"
  | "properties"
  | "tenants"
  | "maintenance"
  | "documents"
  | "financials"
  | "inquiries";
