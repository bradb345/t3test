"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { getStripe } from "~/lib/payments/stripe-client";
import { getStripeAppearance } from "~/lib/payments/stripe-appearance";
import { createPaymentIntent, cancelPaymentIntent } from "~/lib/payments/create-intent";
import { parseMoveInNotes } from "~/lib/payments/types";
import { formatCurrency } from "~/lib/currency/formatter";
import { useTheme } from "~/components/ThemeProvider";
import type { payments } from "~/server/db/schema";

type Payment = typeof payments.$inferSelect;

type Phase = "loading" | "form" | "processing" | "success" | "error";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onPaymentComplete: () => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  payment,
  onPaymentComplete,
}: PaymentModalProps) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState<Phase>("loading");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Create PaymentIntent when modal opens
  useEffect(() => {
    if (!open) return;

    setPhase("loading");
    setClientSecret(null);
    setErrorMessage(null);

    let cancelled = false;

    void createPaymentIntent(payment.id).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setErrorMessage(result.error);
        setPhase("error");
      } else {
        setClientSecret(result.clientSecret);
        setPhase("form");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, payment.id]);

  const handleClose = useCallback(() => {
    // Only cancel the PaymentIntent if one was actually created
    if (phase === "form" || phase === "processing") {
      void cancelPaymentIntent(payment.id);
    }
    onOpenChange(false);
  }, [phase, payment.id, onOpenChange]);

  const handlePaymentSuccess = useCallback(() => {
    setPhase("success");
    // Brief delay so user sees the success state
    setTimeout(() => {
      onPaymentComplete();
      onOpenChange(false);
    }, 1500);
  }, [onPaymentComplete, onOpenChange]);

  const stripePromise = getStripe();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => {
        // Prevent closing during processing/success
        if (phase === "processing" || phase === "success") {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
          <DialogDescription>
            {formatCurrency(payment.amount, payment.currency)} &middot;{" "}
            {payment.type === "move_in" ? "Move-in payment" : "Rent payment"}
          </DialogDescription>
        </DialogHeader>

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Preparing payment...
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm text-destructive">
              {errorMessage}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="mt-3 font-medium">Payment successful!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll receive a confirmation shortly.
            </p>
          </div>
        )}

        {(phase === "form" || phase === "processing") && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: getStripeAppearance(isDark),
            }}
          >
            <PaymentForm
              payment={payment}
              phase={phase}
              setPhase={setPhase}
              setErrorMessage={setErrorMessage}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Inner component — needs Elements context for useStripe()/useElements()
function PaymentForm({
  payment,
  phase,
  setPhase,
  setErrorMessage,
  onSuccess,
}: {
  payment: Payment;
  phase: Phase;
  setPhase: (p: Phase) => void;
  setErrorMessage: (msg: string | null) => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);

  const moveInNotes = payment.type === "move_in" ? parseMoveInNotes(payment.notes) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setPhase("processing");
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setPhase("form");
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {/* Move-in breakdown */}
      {moveInNotes && (
        <div className="mb-4 rounded-md border p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Month&apos;s Rent</span>
            <span className="font-medium">
              {formatCurrency(moveInNotes.rentAmount, payment.currency)}
            </span>
          </div>
          {parseFloat(moveInNotes.securityDeposit) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Security Deposit</span>
              <span className="font-medium">
                {formatCurrency(moveInNotes.securityDeposit, payment.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 font-medium">
            <span>Total</span>
            <span>{formatCurrency(payment.amount, payment.currency)}</span>
          </div>
        </div>
      )}

      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setIsReady(true)}
      />

      {phase === "form" && (
        <>
          {/* Error message displayed below the form */}
          {/* (errorMessage is set by parent, but we don't re-display here since
              the parent handles the error phase) */}
        </>
      )}

      <Button
        type="submit"
        className="mt-4 w-full"
        disabled={!stripe || !elements || !isReady || phase === "processing"}
      >
        {phase === "processing" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay ${formatCurrency(payment.amount, payment.currency)}`
        )}
      </Button>
    </form>
  );
}
