"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";

interface Property {
  id: number;
  // Add other property fields if needed for type safety
}

export function Navbar() {
  const { isSignedIn } = useAuth();
  const [hasProperties, setHasProperties] = useState(false);

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
            </>
          )}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <Button variant="default">Sign In</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </div>
  );
}
