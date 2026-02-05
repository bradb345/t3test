"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import posthog from "posthog-js";

const AUTH_STATE_KEY = "posthog_auth_state";

/**
 * Tracks sign-in and sign-out events in PostHog by watching Clerk auth state.
 * Uses sessionStorage to persist state across page reloads (Clerk redirects
 * after sign-in, so in-memory refs lose the previous state).
 * Must be rendered inside ClerkProvider.
 */
export function PostHogAuthTracker() {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const prevState = sessionStorage.getItem(AUTH_STATE_KEY);

    if (isSignedIn && userId) {
      posthog.identify(userId, {
        email: user?.primaryEmailAddress?.emailAddress,
        name: user?.fullName,
      });

      // If previously recorded as signed out, this is a real sign-in
      if (prevState === "signed_out") {
        posthog.capture("user_signed_in", {
          method: "clerk",
        });
      }

      sessionStorage.setItem(AUTH_STATE_KEY, "signed_in");
    } else if (!isSignedIn) {
      // If previously recorded as signed in, this is a real sign-out
      if (prevState === "signed_in") {
        posthog.capture("user_signed_out", {
          method: "clerk",
        });
        posthog.reset();
      }

      sessionStorage.setItem(AUTH_STATE_KEY, "signed_out");
    }
  }, [isLoaded, isSignedIn, userId, user]);

  return null;
}
