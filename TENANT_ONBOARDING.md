# Tenant Onboarding System Documentation

## Overview

This document describes the comprehensive tenant onboarding system implemented for the property management application. The system supports onboarding initiated by either landlords or tenants, with a full multi-step form process that collects all necessary rental information.

---

## 🎯 Key Features

### For Landlords
- **Easy Invitation**: Send tenant invitations directly from the unit management interface
- **Progress Tracking**: Monitor tenant onboarding progress
- **Automated Emails**: Professional invitation emails sent automatically
- **Secure Data Collection**: All tenant information encrypted and securely stored

### For Tenants
- **Step-by-Step Guidance**: Clear, user-friendly multi-step form
- **Progress Saving**: Save and resume onboarding at any time
- **Mobile Responsive**: Complete onboarding on any device
- **Privacy Focused**: Transparent data usage with encryption

---

## 📊 Database Schema

The following tables were added to support tenant onboarding:

### 1. **tenant_invitations**
Stores invitation records sent by landlords to tenants.

**Fields:**
- `id` - Primary key
- `unitId` - Foreign key to units table
- `landlordId` - Foreign key to user table
- `tenantEmail` - Tenant's email address
- `tenantName` - Tenant's full name
- `invitationToken` - Unique token for onboarding link (32-byte hex)
- `status` - Invitation status (sent, accepted, expired)
- `sentAt` - Timestamp when invitation was sent
- `expiresAt` - Invitation expiration date (30 days from sentAt)
- `acceptedAt` - Timestamp when tenant accepted
- `tenantUserId` - Foreign key to user table (populated when tenant creates account)

### 2. **tenant_onboarding_progress**
Tracks tenant progress through the onboarding steps.

**Fields:**
- `id` - Primary key
- `invitationId` - Foreign key to tenant_invitations
- `tenantUserId` - Foreign key to user table
- `currentStep` - Current step number (1-8)
- `completedSteps` - JSON array of completed step IDs
- `status` - Progress status (not_started, in_progress, completed)
- `data` - JSON object storing all collected data
- `startedAt` - When tenant started onboarding
- `completedAt` - When tenant completed onboarding

### 3. **tenant_profiles**
Stores tenant personal information.

**Fields:**
- `userId` - Foreign key to user table
- `dateOfBirth` - Tenant's date of birth
- `ssn` - Social security number (encrypted)
- `driversLicenseNumber` - Driver's license number
- `driversLicenseState` - State of issuance
- `maritalStatus` - Marital status
- `numberOfOccupants` - Number of people living in unit
- `hasPets` - Boolean for pet ownership
- `petDetails` - Details about pets (type, breed, weight)
- `smokingStatus` - Smoking preference
- `vehicleInfo` - Vehicle information

### 4. **employment_info**
Stores tenant employment and income information.

**Fields:**
- `tenantProfileId` - Foreign key to tenant_profiles
- `employerName` - Name of employer
- `employerAddress` - Employer's address
- `employerPhone` - Employer's phone number
- `position` - Job title/position
- `employmentType` - Type (full_time, part_time, contract, self_employed)
- `startDate` - Employment start date
- `endDate` - Employment end date (null if current)
- `annualIncome` - Annual income amount
- `currency` - Currency code (USD, KYD, etc.)
- `supervisorName` - Name of supervisor
- `supervisorPhone` - Supervisor's phone
- `supervisorEmail` - Supervisor's email
- `isCurrent` - Boolean indicating current employment

### 5. **rental_history**
Stores tenant's previous rental information.

**Fields:**
- `tenantProfileId` - Foreign key to tenant_profiles
- `address` - Address of previous rental
- `landlordName` - Previous landlord's name
- `landlordPhone` - Previous landlord's phone
- `landlordEmail` - Previous landlord's email
- `moveInDate` - When tenant moved in
- `moveOutDate` - When tenant moved out
- `monthlyRent` - Monthly rent amount
- `currency` - Currency code
- `reasonForLeaving` - Reason for leaving
- `isCurrent` - Boolean indicating if still residing there

### 6. **references**
Stores tenant references (personal and professional).

**Fields:**
- `tenantProfileId` - Foreign key to tenant_profiles
- `referenceType` - Type (personal, professional, landlord)
- `fullName` - Reference's full name
- `relationship` - Relationship to tenant
- `phone` - Contact phone number
- `email` - Contact email address
- `yearsKnown` - How many years known
- `canContact` - Permission to contact

### 7. **emergency_contacts**
Stores emergency contact information.

**Fields:**
- `tenantProfileId` - Foreign key to tenant_profiles
- `fullName` - Contact's full name
- `relationship` - Relationship to tenant
- `phone` - Primary phone number
- `alternatePhone` - Alternate phone number
- `email` - Email address
- `address` - Contact's address
- `isPrimary` - Boolean indicating primary emergency contact

### 8. **tenant_documents**
Stores uploaded document information.

**Fields:**
- `tenantProfileId` - Foreign key to tenant_profiles
- `documentType` - Type (government_id, pay_stub, proof_of_address, etc.)
- `fileName` - Original file name
- `fileUrl` - URL to stored file (UploadThing)
- `fileSize` - File size in bytes
- `mimeType` - File MIME type
- `uploadedAt` - Upload timestamp
- `verifiedAt` - When document was verified
- `verifiedBy` - User ID who verified
- `status` - Status (pending_review, approved, rejected)
- `notes` - Verification notes

---

## 🔄 Onboarding Flow

### Landlord-Initiated Flow

1. **Landlord Actions:**
   - Navigate to "My Properties" → Select Property → View Units
   - Click dropdown menu (⋮) on vacant unit card
   - Select "Onboard Tenant" option
   - Modal appears requesting:
     - Tenant Full Name
     - Tenant Email Address
   - Submit invitation

2. **System Actions:**
   - Generate unique 32-byte invitation token
   - Create record in `tenant_invitations` table
   - Create initial record in `tenant_onboarding_progress`
   - Send beautiful HTML email to tenant with:
     - Welcome message
     - Property and unit details
     - Onboarding link with token
     - Step-by-step preview
     - Security and privacy information
   - Set expiration to 30 days from creation

3. **Tenant Actions:**
   - Receive email invitation
   - Click onboarding link: `/onboarding?token={token}`
   - Land on onboarding page
   - Complete 8-step process

### Tenant-Initiated Flow (Future)

For direct signup without invitation:
1. Tenant navigates to signup page
2. Creates account
3. Searches for available properties
4. Applies to specific unit
5. Enters onboarding flow

---

## 📝 Onboarding Steps

### Step 1: Personal Information
**Purpose:** Collect basic identity details

**Fields:**
- First Name *
- Last Name *
- Email Address *
- Phone Number *
- Date of Birth *
- Social Security Number (optional, encrypted)

**Validation:**
- All required fields must be filled
- Email format validation
- Age verification (18+)

**Why We Collect:** Required for identity verification and background checks

---

### Step 2: Contact Details
**Purpose:** Additional contact methods

**Fields:**
- Alternate Phone Number
- Preferred Contact Method (email, phone, SMS)
- Current Address
- Emergency Contact Name
- Emergency Contact Phone

**Validation:**
- Phone number format validation

**Why We Collect:** Ensures we can reach you in various situations

---

### Step 3: Employment Information
**Purpose:** Verify income and employment

**Fields:**
- Employer Name *
- Employer Address
- Employer Phone *
- Position/Job Title *
- Employment Type * (full-time, part-time, contract, self-employed)
- Start Date *
- Annual Income *
- Currency
- Supervisor Name
- Supervisor Phone
- Supervisor Email

**Validation:**
- Required fields validation
- Income must be positive number
- Date validations

**Why We Collect:** Required for income verification and lease approval

---

### Step 4: Rental History
**Purpose:** Understand rental background

**Fields (repeatable for multiple entries):**
- Previous Address *
- Landlord Name *
- Landlord Phone *
- Landlord Email
- Move-In Date *
- Move-Out Date
- Monthly Rent *
- Reason for Leaving

**Validation:**
- At least one rental history entry recommended
- Date range validation
- Rent amount validation

**Why We Collect:** Helps verify rental history and reliability

---

### Step 5: References
**Purpose:** Collect character and professional references

**Fields (minimum 2 references):**
- Reference Type * (personal, professional, previous landlord)
- Full Name *
- Relationship to You *
- Phone Number *
- Email Address
- Years Known
- Permission to Contact *

**Validation:**
- Minimum 2 references required
- Contact information validation

**Why We Collect:** Provides additional verification of character and reliability

---

### Step 6: Emergency Contacts
**Purpose:** People to contact in emergencies

**Fields (minimum 1 contact):**
- Full Name *
- Relationship *
- Primary Phone *
- Alternate Phone
- Email Address
- Address
- Primary Emergency Contact (checkbox)

**Validation:**
- At least one emergency contact required
- Phone validation

**Why We Collect:** Required for safety and emergency situations

---

### Step 7: Document Uploads
**Purpose:** Upload required documents

**Required Documents:**
1. **Government-Issued ID**
   - Driver's License, Passport, or State ID
   - Must be current and not expired
   - Clear, readable photo

2. **Proof of Income**
   - Recent pay stubs (last 2-3 months)
   - Bank statements
   - Tax returns (if self-employed)
   - Employment verification letter

3. **Proof of Address**
   - Utility bill
   - Bank statement
   - Government correspondence
   - Must be recent (within 3 months)

**Optional Documents:**
- Credit report
- Rental references letters
- Pet vaccination records (if applicable)

**File Requirements:**
- Accepted formats: PDF, JPG, PNG
- Maximum file size: 10MB per file
- Multiple files can be uploaded for each category

**Why We Collect:** Required for verification and compliance

---

### Step 8: Review & Sign
**Purpose:** Review all information and digitally sign agreement

**Actions:**
1. Review summary of all provided information
2. Make edits if needed (returns to specific step)
3. Review rental agreement/lease terms
4. Digital signature capture
5. Date and timestamp
6. Submit final application

**Validation:**
- All previous steps must be completed
- Digital signature required
- Acceptance of terms required

**Why We Need This:** Legal requirement for lease agreement

---

## 🔌 API Endpoints

### POST `/api/units/[id]/invite-tenant`
**Purpose:** Landlord sends invitation to tenant

**Request Body:**
```json
{
  "tenantName": "John Doe",
  "tenantEmail": "john.doe@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "invitation": {
    "id": 1,
    "tenantEmail": "john.doe@example.com",
    "tenantName": "John Doe",
    "status": "sent",
    "sentAt": "2024-03-15T10:30:00Z",
    "expiresAt": "2024-04-15T10:30:00Z"
  }
}
```

**Authentication:** Required (landlord must own the property)

---

### GET `/api/onboarding?token={token}`
**Purpose:** Load onboarding progress for tenant

**Query Parameters:**
- `token` - Invitation token (required)

**Response:**
```json
{
  "invitation": {
    "id": 1,
    "unitId": 5,
    "tenantEmail": "john.doe@example.com",
    "tenantName": "John Doe",
    "status": "sent",
    "expiresAt": "2024-04-15T10:30:00Z"
  },
  "progress": {
    "id": 1,
    "currentStep": 3,
    "completedSteps": ["personal", "contact"],
    "status": "in_progress",
    "data": {
      "personal": { ... },
      "contact": { ... }
    },
    "startedAt": "2024-03-15T11:00:00Z",
    "completedAt": null
  }
}
```

**Authentication:** None (token-based access)

**Error Responses:**
- 400: Missing token
- 404: Invalid token
- 410: Expired invitation

---

### PATCH `/api/onboarding?token={token}`
**Purpose:** Save onboarding progress

**Request Body:**
```json
{
  "step": 3,
  "stepData": {
    "employment": {
      "employerName": "Tech Corp",
      "position": "Software Engineer",
      "annualIncome": 85000
    }
  },
  "completedStep": "employment",
  "status": "in_progress"
}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "id": 1,
    "currentStep": 3,
    "completedSteps": ["personal", "contact", "employment"],
    "status": "in_progress",
    "data": { ... }
  }
}
```

**Authentication:** None (token-based access)

---

## 📧 Email Template

### Tenant Invitation Email

**Subject:** Welcome to Your New Home at {unitNumber}!

**Features:**
- Responsive HTML design
- Purple gradient header
- Step-by-step preview
- Clear call-to-action button
- Expiration notice
- Privacy information
- Help/support section
- Mobile-friendly layout

**Template Location:** `src/emails/tenant-invitation.ts`

**Preview:** The email includes:
1. Personalized greeting
2. Landlord and property information
3. Prominent "Start Onboarding" button
4. 6-step process overview with icons
5. Save progress reminder
6. Privacy assurance
7. Footer with links

---

## 🎨 UI Components

### 1. TenantInvitationModal
**Location:** `src/components/TenantInvitationModal.tsx`

**Purpose:** Modal for landlords to invite tenants

**Features:**
- Form validation
- Loading states
- Error handling
- Success toast notifications
- Auto-focus on tenant name field

**Props:**
- `unitId: number` - ID of the unit
- `unitNumber: string` - Unit number for display
- `open: boolean` - Modal open state
- `onClose: () => void` - Close handler

---

### 2. OnboardingProgress
**Location:** `src/components/onboarding/OnboardingProgress.tsx`

**Purpose:** Visual progress indicator

**Features:**
- Desktop: Full horizontal stepper with all steps
- Mobile: Compact progress bar with current step
- Checkmarks for completed steps
- Current step highlighting
- Connecting lines between steps

**Props:**
- `steps: OnboardingStep[]` - Array of step definitions
- `currentStep: number` - Current step number (1-based)
- `completedSteps: string[]` - Array of completed step IDs

---

### 3. Onboarding Page
**Location:** `src/app/onboarding/page.tsx`

**Purpose:** Main onboarding interface

**Features:**
- Token-based authentication
- Auto-save progress
- Step navigation
- Error handling
- Loading states
- Mobile responsive
- Form validation

**URL:** `/onboarding?token={invitationToken}`

---

### 4. UnitCard Enhancement
**Location:** `src/components/UnitCard.tsx`

**Changes:**
- Added "Onboard Tenant" option to dropdown menu
- Only shows for vacant units (no active lease)
- Opens TenantInvitationModal when clicked
- Icon: UserPlus from lucide-react

---

## 🔒 Security & Privacy

### Data Protection
1. **SSN Encryption:** Social Security Numbers are encrypted before storage
2. **Token Security:** 32-byte cryptographically secure random tokens
3. **Token Expiration:** Invitations expire after 30 days
4. **Single-Use Tokens:** Tokens can only be used once
5. **HTTPS Only:** All data transmission over secure connections

### Privacy Compliance
1. **Transparent Collection:** Clear explanation of why each piece of data is collected
2. **Minimal Sharing:** Only necessary information shared with landlords
3. **Secure Storage:** All personal data encrypted at rest
4. **Access Control:** Role-based access to tenant information
5. **Data Retention:** Configurable retention policies

### Best Practices
1. **Input Validation:** All user input validated on client and server
2. **SQL Injection Prevention:** Using Drizzle ORM parameterized queries
3. **XSS Protection:** React's built-in XSS protection
4. **CSRF Protection:** Token-based authentication
5. **Rate Limiting:** API rate limiting (to be implemented)

---

## 🚀 Future Enhancements

### Phase 2 Features
1. **Background Checks Integration**
   - Automated background check requests
   - Credit score verification
   - Criminal history checks
   - Integration with third-party services (Checkr, Stripe Identity)

2. **E-Signature Integration**
   - DocuSign or HelloSign integration
   - Legally binding digital signatures
   - Automatic lease generation
   - Signature status tracking

3. **Payment Integration**
   - Security deposit collection
   - First month's rent payment
   - Application fee processing
   - Stripe or Square integration

4. **Document Verification**
   - Automated ID verification
   - Income verification services
   - OCR for document parsing
   - AI-powered fraud detection

5. **Landlord Dashboard**
   - View all pending onboardings
   - Track progress in real-time
   - Review and approve applications
   - Messaging with tenants

6. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Document camera capture
   - Offline progress saving

7. **Multi-Language Support**
   - Spanish, French, other languages
   - Automatic translation
   - Locale-specific formatting

8. **Advanced Analytics**
   - Onboarding completion rates
   - Average time to complete
   - Drop-off analysis
   - A/B testing for optimization

---

## 🧪 Testing

### Manual Testing Checklist

**Landlord Flow:**
- [ ] Can open invitation modal from unit dropdown
- [ ] Form validation works (empty fields, invalid email)
- [ ] Success message appears after sending
- [ ] Email is received by tenant
- [ ] Email link works correctly

**Tenant Flow:**
- [ ] Can access onboarding with valid token
- [ ] Cannot access with invalid/expired token
- [ ] Progress saves correctly
- [ ] Can navigate between steps
- [ ] Can resume from saved progress
- [ ] Form validations work on all steps
- [ ] File uploads work
- [ ] Final submission works

**Database:**
- [ ] Invitation records created correctly
- [ ] Progress tracks properly
- [ ] Data integrity maintained
- [ ] Foreign keys work correctly

---

## 📦 Dependencies

### New Dependencies Required
```json
{
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-label": "^2.0.2",
  "lucide-react": "^0.292.0" // Already installed
}
```

### Install Command
```bash
npm install @radix-ui/react-dialog @radix-ui/react-label
```

---

## 🔧 Configuration

### Environment Variables
```env
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# Application URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=your_database_url

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret

# UploadThing (for document uploads)
UPLOADTHING_SECRET=your_secret
UPLOADTHING_APP_ID=your_app_id
```

---

## 🏁 Getting Started

### Step 1: Run Database Migrations
```bash
npm run db:push
```

This will create all the new tables in your database.

### Step 2: Install Dependencies
```bash
npm install @radix-ui/react-dialog @radix-ui/react-label
```

### Step 3: Start Development Server
```bash
npm run dev
```

### Step 4: Test the Flow
1. Navigate to "My Properties"
2. Select a property with vacant units
3. Click the dropdown (⋮) on a unit card
4. Select "Onboard Tenant"
5. Fill in tenant details and send invitation
6. Check email for invitation
7. Click link to start onboarding

---

## 💡 Tips & Best Practices

### For Landlords
1. **Verify Email Addresses:** Double-check tenant email before sending
2. **Follow Up:** If tenant doesn't start within a few days, send a reminder
3. **Complete Profile:** Ensure all unit details are complete before inviting
4. **Document Requirements:** Inform tenant about required documents in advance

### For Tenants
1. **Save Frequently:** Use the "Save Progress" button often
2. **Gather Documents:** Collect all required documents before starting
3. **Accurate Information:** Provide accurate information to avoid delays
4. **Complete Promptly:** Try to complete within 7-14 days

### For Developers
1. **Error Handling:** Always handle errors gracefully
2. **Loading States:** Show loading indicators for async operations
3. **Validation:** Validate on both client and server
4. **Testing:** Test with real email addresses and files
5. **Monitoring:** Monitor invitation delivery and completion rates

---

## 📞 Support

For questions or issues:
- Technical: Review this documentation
- Bugs: Check console logs and network tab
- Feature Requests: Document requirements clearly
- Security Concerns: Report immediately to security team

---

## 📄 License

This onboarding system is part of the property management application and follows the same license terms.

---

**Last Updated:** November 21, 2025  
**Version:** 1.0.0  
**Author:** GitHub Copilot
