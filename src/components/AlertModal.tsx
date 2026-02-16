"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

const variantConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600 dark:text-green-400",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
} as const;

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: keyof typeof variantConfig;
  actionLabel?: string;
  onAction?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
  actionLabel = "OK",
  onAction,
  cancelLabel,
  onCancel,
}: AlertModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleAction = () => {
    onAction?.();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${config.bgColor}`}
          >
            <Icon className={`h-6 w-6 ${config.iconColor}`} />
          </div>
          <AlertDialogTitle className="text-center">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          {cancelLabel && (
            <AlertDialogCancel onClick={handleCancel}>
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={handleAction}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
