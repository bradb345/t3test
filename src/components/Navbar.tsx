"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { NotificationBell } from "~/components/NotificationBell";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface Property {
  id: number;
  // Add other property fields if needed for type safety
}

export function Navbar() {
  const { isSignedIn } = useAuth();
  const [hasProperties, setHasProperties] = useState(false);
  const searchParams = useSearchParams();
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSignedIn) {
      // Check if user has properties
      fetch("/api/properties")
        .then((res) => res.json())
        .then((data: Property[]) => {
          setHasProperties(data.length > 0);
        })
        .catch((error) => {
          console.error("Error checking properties:", error);
        });
    }
  }, [isSignedIn]);

  // Auto-open sign-in modal if sign-in=true in URL
  useEffect(() => {
    if (!isSignedIn && searchParams?.get("sign-in") === "true") {
      // Trigger click on sign-in button to open modal
      signInButtonRef.current?.click();
    }
  }, [isSignedIn, searchParams]);

  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Rentr</span>
        </Link>
        <div className="flex items-center gap-4">
          {isSignedIn && !hasProperties && (
            <Link
              href="/list-property"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              List Your Property
            </Link>
          )}
          {isSignedIn && (
            <>
              {hasProperties && (
                <Link
                  href="/my-properties"
                  className="text-sm font-medium text-muted-foreground hover:text-primary"
                >
                  My Properties
                </Link>
              )}
              <Link
                href="/messages"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                Messages
              </Link>
              <NotificationBell />
            </>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <Link
                href="/list-property"
                className="text-sm font-medium text-muted-foreground hover:text-primary"
              >
                List Your Property
              </Link>
              
              <SignInButton
                mode="modal"
                forceRedirectUrl={searchParams?.get("redirect_url") ?? undefined}
              >
                <Button variant="default" ref={signInButtonRef}>
                  Sign In
                </Button>
              </SignInButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
