/**
 * Shared payment type display formatter.
 *
 * Converts DB payment type strings (e.g. "move_in", "rent")
 * into human-readable labels for UI display.
 */
export function formatPaymentType(type: string): string {
  if (type === "move_in") return "Move-In";
  return type.charAt(0).toUpperCase() + type.slice(1);
}
