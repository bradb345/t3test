"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { AlertModal } from "~/components/AlertModal";
import { formatCurrency } from "~/lib/currency/formatter";
import type { TenantWithLease } from "~/types/landlord";

interface Deduction {
  description: string;
  amount: string;
}

interface IssueRefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: TenantWithLease[];
  preselectedTenantId?: number;
  preselectedType?: "refund" | "deposit_return";
}

export function IssueRefundModal({
  open,
  onOpenChange,
  tenants,
  preselectedTenantId,
  preselectedType,
}: IssueRefundModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    preselectedTenantId ? String(preselectedTenantId) : ""
  );
  const [type, setType] = useState<"refund" | "deposit_return">(
    preselectedType ?? "refund"
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    description: "",
    variant: "info" as "success" | "error" | "info",
  });

  // Sync form state from props when modal opens or preselected values change
  useEffect(() => {
    if (open) {
      setSelectedTenantId(preselectedTenantId ? String(preselectedTenantId) : "");
      setType(preselectedType ?? "refund");
      setAmount("");
      setReason("");
      setDeductions([]);
    }
  }, [open, preselectedTenantId, preselectedType]);

  // Get eligible tenants (active or notice_given leases)
  const eligibleTenants = tenants.filter(
    (t) => t.lease.status === "active" || t.lease.status === "notice_given" || t.lease.status === "terminated"
  );

  const selectedTenant = eligibleTenants.find(
    (t) => String(t.user.id) === selectedTenantId
  );

  const securityDeposit = selectedTenant?.lease.securityDeposit
    ? parseFloat(selectedTenant.lease.securityDeposit)
    : 0;

  const totalDeductions = deductions.reduce(
    (sum, d) => sum + (parseFloat(d.amount) || 0),
    0
  );

  const returnAmount =
    type === "deposit_return" ? securityDeposit - totalDeductions : 0;

  const handleAddDeduction = () => {
    setDeductions([...deductions, { description: "", amount: "" }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const sanitizeAmountInput = (value: string) => {
    // Strip anything that isn't a digit or decimal point
    return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  };

  const handleDeductionChange = (
    index: number,
    field: "description" | "amount",
    value: string
  ) => {
    const updated = [...deductions];
    updated[index] = {
      ...updated[index]!,
      [field]: field === "amount" ? sanitizeAmountInput(value) : value,
    };
    setDeductions(updated);
  };

  const handleSubmit = async () => {
    if (!selectedTenantId || !type) return;

    const finalAmount =
      type === "deposit_return" ? returnAmount : parseFloat(amount);

    if (!finalAmount || finalAmount <= 0) {
      setAlertModal({
        open: true,
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const validDeductions =
        type === "deposit_return"
          ? deductions
              .filter((d) => d.description && parseFloat(d.amount) > 0)
              .map((d) => ({
                description: d.description,
                amount: parseFloat(d.amount),
              }))
          : undefined;

      const response = await fetch("/api/landlord/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaseId: selectedTenant!.lease.id,
          type,
          amount: finalAmount,
          reason: reason || undefined,
          deductions: validDeductions,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create refund");
      }

      // Reset form
      setSelectedTenantId(preselectedTenantId ? String(preselectedTenantId) : "");
      setType(preselectedType ?? "refund");
      setAmount("");
      setReason("");
      setDeductions([]);

      // Close the Dialog first, then show the success alert after its exit animation.
      // Overlapping Radix Dialog + AlertDialog causes pointer-events: none to stick on <body>.
      const successDescription =
        type === "deposit_return"
          ? `Security deposit return of ${formatCurrency(finalAmount, selectedTenant!.lease.currency)} initiated. The tenant will be notified to confirm.`
          : `Refund of ${formatCurrency(finalAmount, selectedTenant!.lease.currency)} initiated. The tenant will be notified to confirm.`;

      onOpenChange(false);
      setTimeout(() => {
        setAlertModal({
          open: true,
          title: "Refund Created",
          description: successDescription,
          variant: "success",
        });
        router.refresh();
      }, 300);
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAlertClose = (isOpen: boolean) => {
    setAlertModal((prev) => ({ ...prev, open: isOpen }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Create a refund or return a security deposit to a tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Select
                value={selectedTenantId}
                onValueChange={setSelectedTenantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleTenants.map((t) => (
                    <SelectItem key={t.user.id} value={String(t.user.id)}>
                      {t.user.first_name} {t.user.last_name} - Unit{" "}
                      {t.unit.unitNumber} ({t.property.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type Selection */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as "refund" | "deposit_return");
                  setDeductions([]);
                  setAmount("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="deposit_return">
                    Security Deposit Return
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount (for regular refunds) */}
            {type === "refund" && (
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                />
              </div>
            )}

            {/* Deposit Return Details */}
            {type === "deposit_return" && selectedTenant && (
              <div className="space-y-4">
                <div className="rounded-md border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Security Deposit
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        securityDeposit,
                        selectedTenant.lease.currency
                      )}
                    </span>
                  </div>
                  {totalDeductions > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Total Deductions</span>
                      <span className="font-medium">
                        -
                        {formatCurrency(
                          totalDeductions,
                          selectedTenant.lease.currency
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Return Amount</span>
                    <span
                      className={
                        returnAmount > 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatCurrency(
                        Math.max(0, returnAmount),
                        selectedTenant.lease.currency
                      )}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Deductions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDeduction}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add Deduction
                    </Button>
                  </div>
                  {deductions.map((deduction, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Description"
                        value={deduction.description}
                        onChange={(e) =>
                          handleDeductionChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        className="flex-1"
                      />
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={deduction.amount}
                        onChange={(e) =>
                          handleDeductionChange(index, "amount", e.target.value)
                        }
                        className="w-28"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDeduction(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>
                Reason{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                placeholder="Reason for this refund..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !selectedTenantId ||
                (type === "refund" && (!amount || parseFloat(amount) <= 0)) ||
                (type === "deposit_return" && returnAmount <= 0)
              }
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : type === "deposit_return" ? (
                "Return Deposit"
              ) : (
                "Issue Refund"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertModal
        open={alertModal.open}
        onOpenChange={handleAlertClose}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
      />
    </>
  );
}
