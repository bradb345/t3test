"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { PaymentStatusSummary } from "./PaymentStatusSummary";
import { RentCollectionTable } from "./RentCollectionTable";
import { StripeConnectCard } from "./StripeConnectCard";
import type { PaymentWithDetails, PropertyWithUnits } from "~/types/landlord";

interface FinancialsTabProps {
  payments: PaymentWithDetails[];
  properties: PropertyWithUnits[];
  currency: string;
  stripeConnectedAccountStatus: string | null;
}

export function FinancialsTab({ payments, properties, currency, stripeConnectedAccountStatus }: FinancialsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  // Get unique months from payments
  const uniqueMonths = Array.from(
    new Set(
      payments.map((p) => {
        const date = new Date(p.dueDate);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      })
    )
  ).sort().reverse();

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue"
        ? payment.status === "pending" && new Date(payment.dueDate) < new Date()
        : payment.status === statusFilter);
    const matchesProperty =
      propertyFilter === "all" ||
      payment.property.id.toString() === propertyFilter;
    const matchesMonth =
      monthFilter === "all" ||
      (() => {
        const date = new Date(payment.dueDate);
        const paymentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        return paymentMonth === monthFilter;
      })();

    return matchesStatus && matchesProperty && matchesMonth;
  });

  const clearFilters = () => {
    setStatusFilter("all");
    setPropertyFilter("all");
    setMonthFilter("all");
  };

  const hasActiveFilters =
    statusFilter !== "all" || propertyFilter !== "all" || monthFilter !== "all";

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year!), parseInt(month!) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Financials</h2>
          <p className="text-muted-foreground">
            Track rent collection and payment status
          </p>
        </div>
      </div>

      {/* Stripe Connect Status */}
      <StripeConnectCard initialStatus={stripeConnectedAccountStatus} />

      {/* Summary Cards */}
      <PaymentStatusSummary payments={payments} currency={currency} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {uniqueMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {formatMonth(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Payments Table */}
      <RentCollectionTable payments={filteredPayments} currency={currency} />
    </div>
  );
}
