"use client";

import { DollarSign, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PaymentWithDetails } from "~/types/landlord";

interface PaymentStatusSummaryProps {
  payments: PaymentWithDetails[];
  currency: string;
}

export function PaymentStatusSummary({ payments, currency }: PaymentStatusSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const paidPayments = payments.filter((p) => p.status === "completed");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const overduePayments = payments.filter(
    (p) => p.status === "pending" && new Date(p.dueDate) < new Date()
  );

  const paidTotal = paidPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );
  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );
  const overdueTotal = overduePayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(paidTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {paidPayments.length} payments
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(pendingTotal - overdueTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {pendingPayments.length - overduePayments.length} payments awaiting
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(overdueTotal)}
          </div>
          <p className="text-xs text-muted-foreground">
            {overduePayments.length} payments overdue
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
          <p className="text-xs text-muted-foreground">
            {pendingPayments.length} total pending
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
