"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";

export function Navbar() {
  const { isSignedIn } = useAuth();

  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Rentr</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/list-property"
            className="text-sm font-medium text-muted-foreground hover:text-primary"
          >
            List Your Property
          </Link>
          {isSignedIn && (
            <Link
              href="/messages"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Messages
            </Link>
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
