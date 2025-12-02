// Type definitions for Tenant Onboarding System

export interface TenantInvitation {
  id: number;
  unitId: number;
  landlordId: number;
  tenantEmail: string;
  tenantName: string;
  invitationToken: string;
  status: 'sent' | 'accepted' | 'expired' | 'cancelled';
  sentAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  tenantUserId: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface TenantOnboardingProgress {
  id: number;
  invitationId: number;
  tenantUserId: number | null;
  currentStep: number;
  completedSteps: string[];
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  data: OnboardingData;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface OnboardingData {
  personal?: PersonalInfo;
  contact?: ContactInfo;
  employment?: EmploymentInfo[];
  rentalHistory?: RentalHistoryEntry[];
  references?: Reference[];
  emergencyContacts?: EmergencyContact[];
  documents?: DocumentUpload[];
  additionalInfo?: AdditionalInfo;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn?: string;
  driversLicenseNumber?: string;
  driversLicenseState?: string;
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'partnered';
}

export interface ContactInfo {
  alternatePhone?: string;
  preferredContactMethod?: 'email' | 'phone' | 'sms';
  currentAddress?: string;
  currentCity?: string;
  currentState?: string;
  currentZipCode?: string;
  currentCountry?: string;
  mailingAddressSameAsCurrent?: boolean;
  mailingAddress?: string;
}

export interface EmploymentInfo {
  employerName: string;
  employerAddress?: string;
  employerPhone?: string;
  position: string;
  employmentType: 'full_time' | 'part_time' | 'contract' | 'self_employed' | 'unemployed';
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  annualIncome: number;
  currency: string;
  supervisorName?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  additionalIncomeSource?: string;
  additionalIncomeAmount?: number;
}

export interface RentalHistoryEntry {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  landlordName: string;
  landlordPhone?: string;
  landlordEmail?: string;
  moveInDate: string;
  moveOutDate?: string;
  monthlyRent: number;
  currency: string;
  reasonForLeaving?: string;
  isCurrent: boolean;
  canContactLandlord: boolean;
}

export interface Reference {
  referenceType: 'personal' | 'professional' | 'previous_landlord';
  fullName: string;
  relationship: string;
  phone: string;
  email?: string;
  yearsKnown?: number;
  canContact: boolean;
  notes?: string;
}

export interface EmergencyContact {
  fullName: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isPrimary: boolean;
}

export interface DocumentUpload {
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  notes?: string;
}

export type DocumentType =
  | 'government_id'
  | 'drivers_license'
  | 'passport'
  | 'pay_stub'
  | 'bank_statement'
  | 'tax_return'
  | 'employment_verification'
  | 'proof_of_address'
  | 'credit_report'
  | 'reference_letter'
  | 'pet_vaccination'
  | 'other';

export interface AdditionalInfo {
  numberOfOccupants?: number;
  occupantDetails?: OccupantDetail[];
  hasPets?: boolean;
  petDetails?: PetDetail[];
  smokingStatus?: 'non_smoker' | 'smoker' | 'occasional';
  hasVehicle?: boolean;
  vehicleInfo?: VehicleInfo[];
  specialRequests?: string;
  howDidYouHearAboutUs?: string;
}

export interface OccupantDetail {
  fullName: string;
  relationship: string;
  dateOfBirth?: string;
  isMinor: boolean;
}

export interface PetDetail {
  petType: 'dog' | 'cat' | 'bird' | 'fish' | 'other';
  breed?: string;
  name?: string;
  weight?: number;
  age?: number;
  isServiceAnimal?: boolean;
  isEmotionalSupportAnimal?: boolean;
  vaccinationRecordUrl?: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  state?: string;
}

// API Response Types

export interface InvitationResponse {
  success: boolean;
  invitation: {
    id: number;
    tenantEmail: string;
    tenantName: string;
    status: string;
    sentAt: string;
    expiresAt: string;
  };
}

export interface OnboardingLoadResponse {
  invitation: {
    id: number;
    unitId: number;
    tenantEmail: string;
    tenantName: string;
    status: string;
    expiresAt: string;
  };
  progress: {
    id: number;
    currentStep: number;
    completedSteps: string[];
    status: string;
    data: OnboardingData;
    startedAt: string | null;
    completedAt: string | null;
  };
}

export interface OnboardingSaveResponse {
  success: boolean;
  progress: {
    id: number;
    currentStep: number;
    completedSteps: string[];
    status: string;
    data: OnboardingData;
  };
}

export interface OnboardingSaveRequest {
  step?: number;
  stepData?: Partial<OnboardingData>;
  completedStep?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
}

// Form Validation Types

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Onboarding Step Configuration

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component?: string;
  fields?: string[];
  requiredFields?: string[];
  validationSchema?: unknown;
  helpText?: string;
  estimatedTime?: number; // minutes
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Basic identity details',
    requiredFields: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'],
    helpText: 'This information helps verify your identity and communicate with you.',
    estimatedTime: 3,
  },
  {
    id: 'contact',
    title: 'Contact Details',
    description: 'How to reach you',
    requiredFields: ['currentAddress'],
    helpText: 'Ensures we can reach you in various situations.',
    estimatedTime: 2,
  },
  {
    id: 'employment',
    title: 'Employment Information',
    description: 'Income verification',
    requiredFields: ['employerName', 'position', 'annualIncome'],
    helpText: 'Required for income verification and lease approval.',
    estimatedTime: 5,
  },
  {
    id: 'rentalHistory',
    title: 'Rental History',
    description: 'Previous rentals',
    requiredFields: ['address', 'landlordName', 'moveInDate', 'monthlyRent'],
    helpText: 'Helps verify rental history and reliability.',
    estimatedTime: 5,
  },
  {
    id: 'references',
    title: 'References',
    description: 'Personal references',
    requiredFields: ['fullName', 'phone'],
    helpText: 'Provides additional verification of character and reliability.',
    estimatedTime: 3,
  },
  {
    id: 'emergencyContacts',
    title: 'Emergency Contacts',
    description: 'Emergency contacts',
    requiredFields: ['fullName', 'relationship', 'phone'],
    helpText: 'Required for safety and emergency situations.',
    estimatedTime: 2,
  },
  {
    id: 'documents',
    title: 'Document Uploads',
    description: 'Upload documents',
    requiredFields: ['government_id', 'proof_of_income'],
    helpText: 'Required for verification and compliance.',
    estimatedTime: 10,
  },
  {
    id: 'review',
    title: 'Review & Sign',
    description: 'Final review',
    requiredFields: ['signature', 'termsAccepted'],
    helpText: 'Review all information and digitally sign.',
    estimatedTime: 5,
  },
];

// Utility Types

export type OnboardingStepId = typeof ONBOARDING_STEPS[number]['id'];

export interface OnboardingContextType {
  currentStep: number;
  completedSteps: string[];
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;
  goToStep: (step: number) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  saveProgress: (stepData: Partial<OnboardingData>) => Promise<void>;
  completeStep: (stepId: string, stepData: Partial<OnboardingData>) => Promise<void>;
}
