"use client";

import Link from "next/link";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";
import { NotificationBell } from "~/components/NotificationBell";
import { ThemeToggle } from "~/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";

interface Property {
  id: number;
}

interface UserRoles {
  roles: string[];
  hasActiveLease: boolean;
  hasPendingApplication: boolean;
  hasViewingRequest: boolean;
}

export function Navbar() {
  const { isSignedIn } = useAuth();
  const [hasProperties, setHasProperties] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const [signInButtonElement, setSignInButtonElement] =
    useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    const controller = new AbortController();

    fetch("/api/properties", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: Property[]) => {
        setHasProperties(data.length > 0);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error checking properties:", error);
      });

    fetch("/api/tenant/check", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: UserRoles) => {
        setShowDashboard(data.hasActiveLease || data.hasPendingApplication || data.hasViewingRequest);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Error checking tenant status:", error);
      });

    return () => controller.abort();
  }, [isSignedIn]);

  const signInButtonRef = useCallback((node: HTMLButtonElement | null) => {
    setSignInButtonElement(node);
  }, []);

  useEffect(() => {
    if (
      !isSignedIn &&
      searchParams?.get("sign-in") === "true" &&
      signInButtonElement
    ) {
      signInButtonElement.click();
    }
  }, [isSignedIn, searchParams, signInButtonElement]);

  const navLinks = (
    <>
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
          {showDashboard && (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-primary"
            >
              Dashboard
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
      {!isSignedIn && (
        <Link
          href="/list-property"
          className="text-sm font-medium text-muted-foreground hover:text-primary"
        >
          List Your Property
        </Link>
      )}
    </>
  );

  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">Rentr</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          {navLinks}
          {isSignedIn && <NotificationBell />}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton
              mode="modal"
              forceRedirectUrl={
                searchParams?.get("redirect_url") ?? undefined
              }
            >
              <Button variant="default" ref={signInButtonRef}>
                Sign In
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile nav */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          {isSignedIn && <NotificationBell />}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton
              mode="modal"
              forceRedirectUrl={
                searchParams?.get("redirect_url") ?? undefined
              }
            >
              <Button variant="default" ref={signInButtonRef} size="sm">
                Sign In
              </Button>
            </SignInButton>
          )}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav
                className="mt-6 flex flex-col gap-4"
                onClick={() => setMobileMenuOpen(false)}
              >
                {navLinks}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
