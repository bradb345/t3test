"use client";

import { User, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import type { PaymentWithDetails } from "~/types/landlord";

interface RentCollectionTableProps {
  payments: PaymentWithDetails[];
  currency: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  completed: {
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    icon: <Clock className="h-3 w-3" />,
  },
  failed: {
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  overdue: {
    color: "bg-red-100 text-red-800",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function RentCollectionTable({ payments, currency }: RentCollectionTableProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(num);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPaymentStatus = (payment: PaymentWithDetails) => {
    if (payment.status === "completed") return "completed";
    if (payment.status === "failed") return "failed";
    if (new Date(payment.dueDate) < new Date()) return "overdue";
    return "pending";
  };

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No payment records found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Property / Unit</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid On</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => {
            const status = getPaymentStatus(payment);
            const config = statusConfig[status] ?? statusConfig.pending;

            return (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.tenant.first_name} {payment.tenant.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {payment.tenant.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {payment.property.name}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unit {payment.unit.unitNumber}
                  </p>
                </TableCell>
                <TableCell className="capitalize">{payment.type}</TableCell>
                <TableCell>{formatDate(payment.dueDate)}</TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.amount)}
                </TableCell>
                <TableCell>
                  <Badge className={config.color}>
                    <span className="mr-1">{config.icon}</span>
                    {status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payment.paidAt ? formatDate(payment.paidAt) : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
