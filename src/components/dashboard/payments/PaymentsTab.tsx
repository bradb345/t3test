"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
} from "lucide-react";
import type { leases, units, properties, payments } from "~/server/db/schema";
import { formatDate } from "~/lib/date";
import { formatCurrency } from "~/lib/currency";

type Lease = typeof leases.$inferSelect;
type Unit = typeof units.$inferSelect;
type Property = typeof properties.$inferSelect;
type Payment = typeof payments.$inferSelect;

interface LeaseWithDetails {
  lease: Lease;
  unit: Unit;
  property: Property;
}

interface PaymentsTabProps {
  payments: Payment[];
  lease: LeaseWithDetails;
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
  },
  completed: {
    label: "Paid",
    variant: "default" as const,
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
  overdue: {
    label: "Overdue",
    variant: "destructive" as const,
    icon: AlertCircle,
  },
};

export function PaymentsTab({ payments, lease }: PaymentsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">
          View your billing history and manage payments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payment Methods Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your payment methods for rent payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Coming Soon</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Online payment setup will be available soon.
              </p>
              <Button className="mt-4" disabled>
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Make Payment Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Make a Payment
            </CardTitle>
            <CardDescription>
              Pay your rent or make additional payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Coming Soon</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Online payments will be available soon.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Monthly rent:{" "}
                <span className="font-medium">
                  {formatCurrency(lease.lease.monthlyRent, lease.lease.currency)}
                </span>
              </p>
              <Button className="mt-4" disabled>
                Make Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View your past and upcoming payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">No payment history</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">Date</th>
                    <th className="p-3 text-left text-sm font-medium">Type</th>
                    <th className="p-3 text-left text-sm font-medium">Amount</th>
                    <th className="p-3 text-left text-sm font-medium">Status</th>
                    <th className="p-3 text-left text-sm font-medium">Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const status =
                      statusConfig[payment.status as keyof typeof statusConfig] ??
                      statusConfig.pending;

                    return (
                      <tr key={payment.id} className="border-b last:border-0">
                        <td className="p-3 text-sm">
                          {formatDate(payment.dueDate)}
                        </td>
                        <td className="p-3 text-sm capitalize">{payment.type}</td>
                        <td className="p-3 text-sm font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </td>
                        <td className="p-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {payment.paidAt ? formatDate(payment.paidAt) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
