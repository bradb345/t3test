/**
 * Type definitions for tenant offboarding flow
 */

import type { tenantOffboardingNotices } from "~/server/db/schema";
import type { User, Lease, Unit, Property } from "~/types/schema";

// Status types
export type OffboardingStatus = "active" | "cancelled" | "inspection_scheduled" | "completed";
export type DepositStatus = "pending" | "returned" | "withheld" | "partial";
export type InitiatedBy = "tenant" | "landlord";

// Base types from schema
export type OffboardingNotice = typeof tenantOffboardingNotices.$inferSelect;
export type { User, Lease, Unit, Property };

// Extended types with relations
export interface OffboardingWithDetails extends OffboardingNotice {
  lease: Lease;
  tenant: User;
  landlord: User;
  unit: Unit;
  property: Property;
  initiatedByUser: User;
}

// API request/response types
export interface CreateOffboardingRequest {
  leaseId: number;
  reason?: string;
}

export interface UpdateOffboardingRequest {
  inspectionDate?: string;
  inspectionNotes?: string;
  inspectionCompleted?: boolean;
  depositStatus?: DepositStatus;
  depositNotes?: string;
}

export interface CancelOffboardingRequest {
  cancellationReason?: string;
}

export interface CompleteOffboardingRequest {
  inspectionNotes?: string;
  depositStatus: DepositStatus;
  depositNotes?: string;
}

export interface FastTrackOffboardingRequest {
  leaseId: number;
}

// Response types
export interface OffboardingResponse {
  notice: OffboardingNotice;
  message?: string;
}

export interface OffboardingListResponse {
  notices: OffboardingWithDetails[];
}
