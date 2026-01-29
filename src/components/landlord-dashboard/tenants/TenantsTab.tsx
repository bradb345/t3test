"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, Filter } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { TenantCard } from "./TenantCard";
import { TenantDetailModal } from "./TenantDetailModal";
import type { TenantWithLease, User } from "~/types/landlord";

interface TenantsTabProps {
  tenants: TenantWithLease[];
  currentUser?: User | null;
}

export function TenantsTab({ tenants, currentUser }: TenantsTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [selectedTenant, setSelectedTenant] = useState<TenantWithLease | null>(null);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesStatus = statusFilter === "all" || tenant.lease.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      tenant.user.first_name.toLowerCase().includes(searchLower) ||
      tenant.user.last_name.toLowerCase().includes(searchLower) ||
      tenant.user.email.toLowerCase().includes(searchLower) ||
      tenant.property.name.toLowerCase().includes(searchLower) ||
      tenant.unit.unitNumber.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const hasActiveFilters = statusFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenants</h2>
          <p className="text-muted-foreground">
            View and manage all tenants across your properties
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="notice_given">Notice Given</SelectItem>
            <SelectItem value="terminated">Completed</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">
            {searchQuery || hasActiveFilters ? "No tenants found" : "No tenants yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchQuery || hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Invite tenants to your properties to see them here"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((tenant) => (
            <TenantCard
              key={`${tenant.lease.id}`}
              tenant={tenant}
              onViewDetails={setSelectedTenant}
            />
          ))}
        </div>
      )}

      <TenantDetailModal
        open={!!selectedTenant}
        onOpenChange={(open) => !open && setSelectedTenant(null)}
        tenant={selectedTenant}
        currentUser={currentUser}
        onOffboardingChange={() => router.refresh()}
      />
    </div>
  );
}
