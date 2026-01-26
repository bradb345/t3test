/**
 * Valid document types for tenant document uploads
 * Used for both frontend display and backend validation
 */
export const documentTypes = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "pay_stub", label: "Pay Stub" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "other", label: "Other" },
] as const;

/**
 * Array of valid document type values for validation
 */
export const validDocumentTypes = documentTypes.map((t) => t.value);

/**
 * Type for document type values
 */
export type DocumentType = (typeof documentTypes)[number]["value"];

/**
 * Check if a string is a valid document type
 */
export function isValidDocumentType(type: string): type is DocumentType {
  return validDocumentTypes.includes(type as DocumentType);
}
