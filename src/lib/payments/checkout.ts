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
    try {
      const data = (await res.json()) as { error?: string };
      return data.error ?? "Failed to initiate checkout. Please try again.";
    } catch {
      return "An unexpected error occurred while initiating checkout.";
    }
  }

  try {
    const data = (await res.json()) as { checkoutUrl?: string };
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return "";
    }
    return "Failed to initiate checkout. Please try again.";
  } catch {
    return "Failed to initiate checkout. Please try again.";
  }
}
