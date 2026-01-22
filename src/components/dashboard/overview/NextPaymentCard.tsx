"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { CreditCard, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import type { leases, units, properties, payments } from "~/server/db/schema";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface NextPaymentCardProps {
  payment: Payment | null;
  lease: LeaseWithDetails;
}

export function NextPaymentCard({ payment, lease }: NextPaymentCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: string | number, currency: string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!payment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Next Payment
          </CardTitle>
          <CardDescription>Your upcoming rent payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="mb-2 h-12 w-12 text-green-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">
              No pending payments at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysUntilDue = getDaysUntilDue(payment.dueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Next Payment
          </CardTitle>
          {isOverdue ? (
            <Badge variant="destructive">Overdue</Badge>
          ) : isDueSoon ? (
            <Badge variant="secondary">Due Soon</Badge>
          ) : (
            <Badge variant="outline">Upcoming</Badge>
          )}
        </div>
        <CardDescription>Your upcoming rent payment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-3xl font-bold">
            {formatCurrency(payment.amount, payment.currency)}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {payment.type} payment
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Due {formatDate(payment.dueDate)}</span>
        </div>

        {isOverdue ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>This payment is {Math.abs(daysUntilDue)} days overdue</span>
          </div>
        ) : isDueSoon ? (
          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500">
            <AlertCircle className="h-4 w-4" />
            <span>Due in {daysUntilDue} days</span>
          </div>
        ) : null}

        <Button className="w-full" disabled>
          Make Payment (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  );
}
