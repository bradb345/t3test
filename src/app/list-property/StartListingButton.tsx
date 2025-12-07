"use client";

import { SignInButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function StartListingButton() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return (
      <Link href="/list-property/create">
        <Button size="lg">Start Listing</Button>
      </Link>
    );
  }

  return (
    <SignInButton 
      mode="modal" 
      forceRedirectUrl="/list-property/create"
      signUpForceRedirectUrl="/list-property/create"
    >
      <Button size="lg">Start Listing</Button>
    </SignInButton>
  );
}
