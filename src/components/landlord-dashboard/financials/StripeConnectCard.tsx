"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

interface ConnectStatus {
  connected: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  onboardingComplete: boolean;
}

interface StripeConnectCardProps {
  initialStatus: string | null; // stripeConnectedAccountStatus from user
}

export function StripeConnectCard({ initialStatus }: StripeConnectCardProps) {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/landlord/stripe/status");
        if (res.ok) {
          const data = (await res.json()) as ConnectStatus;
          setStatus(data);
        }
      } catch {
        // Non-critical — we'll show based on initialStatus
      } finally {
        setIsLoading(false);
      }
    }
    void fetchStatus();
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/landlord/stripe/connect", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error);
      }
      const data = (await res.json()) as { url?: string; complete?: boolean };
      if (data.complete) {
        // Test mode: account was created and fully onboarded automatically
        setStatus({
          connected: true,
          payoutsEnabled: true,
          chargesEnabled: true,
          onboardingComplete: true,
        });
        setIsConnecting(false);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnecting(false);
    }
  };

  const isComplete =
    status?.onboardingComplete ?? initialStatus === "complete";
  const isPending =
    !isComplete && (status?.connected ?? initialStatus === "pending");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Stripe Payouts</CardTitle>
            <CardDescription>
              Connect your bank account to receive rent payments
            </CardDescription>
          </div>
          {isComplete && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
          {isPending && (
            <Badge className="bg-yellow-100 text-yellow-800">
              <AlertCircle className="mr-1 h-3 w-3" />
              Incomplete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isComplete ? (
          <p className="text-sm text-muted-foreground">
            Your Stripe account is connected. Payouts will be sent to your bank
            account after rent payments are processed.
          </p>
        ) : isPending ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your Stripe onboarding is incomplete. Please finish setting up your
              account to start receiving payouts.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  Resume Onboarding
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect your bank account via Stripe to receive rent payments from
              your tenants. This is a one-time setup.
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Connect with Stripe
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
