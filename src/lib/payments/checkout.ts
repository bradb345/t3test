/**
 * Initiates a Stripe Checkout session for a payment and redirects the browser.
 * Returns an error message string on failure, or never returns on success (redirect).
 */
export async function initiateCheckout(paymentId: number): Promise<string> {
  const res = await fetch("/api/tenant/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentId }),
  });

  if (!res.ok) {
    const data = (await res.json()) as { error: string };
    return data.error;
  }

  const data = (await res.json()) as { checkoutUrl: string };
  window.location.href = data.checkoutUrl;

  // The redirect means we never reach here in practice,
  // but return empty string to satisfy the type system.
  return "";
}
