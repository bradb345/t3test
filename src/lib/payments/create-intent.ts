interface CreateIntentSuccess {
  clientSecret: string;
  paymentIntentId: string;
  error?: undefined;
}

interface CreateIntentError {
  clientSecret?: undefined;
  paymentIntentId?: undefined;
  error: string;
}

type CreateIntentResult = CreateIntentSuccess | CreateIntentError;

/** Call the API to create a PaymentIntent and return the clientSecret. */
export async function createPaymentIntent(paymentId: number): Promise<CreateIntentResult> {
  try {
    const res = await fetch("/api/tenant/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: data.error ?? "Failed to initiate payment. Please try again." };
    }

    const data = (await res.json()) as { clientSecret?: string; paymentIntentId?: string };
    if (!data.clientSecret || !data.paymentIntentId) {
      return { error: "Failed to initiate payment. Please try again." };
    }

    return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
  } catch {
    return { error: "An unexpected error occurred. Please try again." };
  }
}

/** Call the API to cancel/reset a processing payment back to pending. */
export async function cancelPaymentIntent(paymentId: number): Promise<void> {
  try {
    await fetch("/api/tenant/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, action: "cancel" }),
    });
  } catch {
    // Best-effort — don't block UI if cancel fails
  }
}
