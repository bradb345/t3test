"use client";

import { useState } from "react";
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
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";
import type { leases, units, properties, payments } from "~/server/db/schema";
import { formatDate } from "~/lib/date";
import { formatCurrency } from "~/lib/currency/formatter";
import { isOnlinePaymentSupported } from "~/lib/payments";
import { formatPaymentType } from "~/lib/payments/format";
import { parseMoveInNotes } from "~/lib/payments/types";
import { useRouter } from "next/navigation";
import { PaymentModal } from "./PaymentModal";

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
  processing: {
    label: "Processing",
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
  const currency = lease.lease.currency;
  const onlineSupported = isOnlinePaymentSupported(currency);
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Find next pending payment
  const nextPending = payments.find((p) => p.status === "pending");

  const handleMakePayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setModalOpen(true);
  };

  const handlePaymentComplete = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">
          View your billing history and manage payments
        </p>
      </div>

      {/* Make a Payment */}
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
          {!onlineSupported ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Info className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="font-medium">Online payments not available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Online payment is not yet supported for {currency} properties.
                Please contact your landlord for payment instructions.
              </p>
            </div>
          ) : nextPending ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <p className="text-3xl font-bold">
                {formatCurrency(nextPending.amount, nextPending.currency)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPaymentType(nextPending.type)} payment
              </p>
              {nextPending.type === "move_in" && (() => {
                const notes = parseMoveInNotes(nextPending.notes);
                if (!notes) return null;
                const showDeposit = parseFloat(notes.securityDeposit) > 0;
                return (
                  <div className="mt-2 w-full rounded-md border p-3 text-sm space-y-1 text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">First Month&apos;s Rent</span>
                      <span className="font-medium">
                        {formatCurrency(notes.rentAmount, nextPending.currency)}
                      </span>
                    </div>
                    {showDeposit && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span className="font-medium">
                          {formatCurrency(notes.securityDeposit, nextPending.currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className="mt-2 text-sm text-muted-foreground">
                Due {formatDate(nextPending.dueDate)}
              </p>
              <Button
                className="mt-4 w-full"
                onClick={() => handleMakePayment(nextPending)}
              >
                {nextPending.type === "move_in"
                  ? "Pay Move-In"
                  : "Make Payment"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
              <p className="font-medium">All caught up!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No pending payments at this time.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Monthly rent:{" "}
                <span className="font-medium">
                  {formatCurrency(lease.lease.monthlyRent, currency)}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                        <td className="p-3 text-sm">{formatPaymentType(payment.type)}</td>
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

      {/* Payment Modal */}
      {selectedPayment && (
        <PaymentModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          payment={selectedPayment}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
