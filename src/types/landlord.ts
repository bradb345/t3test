/**
 * Shared type definitions for landlord dashboard components
 */

import type {
  User,
  Lease,
  Unit,
  Property,
  Payment,
  MaintenanceRequest,
  TenantDocument,
} from "~/types/schema";

// Re-export base types
export type { User, Lease, Unit, Property, Payment, MaintenanceRequest, TenantDocument };

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

// Tenancy application types (for applications tab)
export interface TenancyApplication {
  id: number;
  unitId: number;
  applicantUserId: number;
  status: "pending" | "under_review" | "approved" | "rejected" | "withdrawn";
  applicationData: string | null;
  paymentSetupComplete: boolean;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: number | null;
  decision: string | null;
  decisionNotes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface TenancyApplicationWithDetails {
  id: number;
  status: string;
  decision: string | null;
  decisionNotes: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  paymentSetupComplete: boolean;
  unit: {
    id: number;
    unitNumber: string;
    monthlyRent: string;
    currency: string;
  };
  property: {
    id: number;
    name: string;
    address: string;
  };
  applicant: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    imageUrl: string | null;
  };
}

// Tab values for URL query params
export type LandlordDashboardTab =
  | "overview"
  | "properties"
  | "tenants"
  | "maintenance"
  | "documents"
  | "financials"
  | "inquiries"
  | "applications";
