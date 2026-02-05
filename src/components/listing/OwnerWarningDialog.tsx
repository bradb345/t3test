"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface OwnerWarningDialogProps {
  open: boolean;
  onClose: () => void;
  actionType: "viewing" | "contact" | "apply";
}

export function OwnerWarningDialog({
  open,
  onClose,
  actionType,
}: OwnerWarningDialogProps) {
  const actionText = {
    viewing: "request a viewing",
    contact: "contact the landlord",
    apply: "apply for tenancy",
  }[actionType];

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center">
            You Own This Property
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You cannot {actionText} for a unit that you own. This action is only
            available for prospective tenants.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction onClick={onClose}>Got It</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
