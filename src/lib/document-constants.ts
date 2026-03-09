/**
 * Valid document types for tenant document uploads (used during onboarding/application)
 */
export const documentTypes = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "pay_stub", label: "Pay Stub" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "other", label: "Other" },
] as const;

export const validDocumentTypes = documentTypes.map((t) => t.value);
export type DocumentType = (typeof documentTypes)[number]["value"];

export function isValidDocumentType(type: string): type is DocumentType {
  return validDocumentTypes.includes(type as DocumentType);
}

/**
 * Valid document types for unit documents (shared between landlord and tenant)
 */
export const unitDocumentTypes = [
  { value: "lease_agreement", label: "Lease Agreement" },
  { value: "insurance", label: "Insurance" },
  { value: "compliance", label: "Compliance" },
  { value: "inspection_report", label: "Inspection Report" },
  { value: "move_in_checklist", label: "Move-in Checklist" },
  { value: "other", label: "Other" },
] as const;

export const validUnitDocumentTypes = unitDocumentTypes.map((t) => t.value);
export type UnitDocumentType = (typeof unitDocumentTypes)[number]["value"];

export function isValidUnitDocumentType(type: string): type is UnitDocumentType {
  return validUnitDocumentTypes.includes(type as UnitDocumentType);
}

export const unitDocumentTypeLabels: Record<string, string> = Object.fromEntries(
  unitDocumentTypes.map((t) => [t.value, t.label])
);
