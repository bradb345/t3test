"use client";

import { useState } from "react";
import { Users, Search } from "lucide-react";
import { Input } from "~/components/ui/input";
import { TenantCard } from "./TenantCard";
import { TenantDetailModal } from "./TenantDetailModal";
import type { TenantWithLease } from "~/types/landlord";

interface TenantsTabProps {
  tenants: TenantWithLease[];
}

export function TenantsTab({ tenants }: TenantsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantWithLease | null>(null);

  const filteredTenants = tenants.filter((tenant) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      tenant.user.first_name.toLowerCase().includes(searchLower) ||
      tenant.user.last_name.toLowerCase().includes(searchLower) ||
      tenant.user.email.toLowerCase().includes(searchLower) ||
      tenant.property.name.toLowerCase().includes(searchLower) ||
      tenant.unit.unitNumber.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenants</h2>
          <p className="text-muted-foreground">
            View and manage all tenants across your properties
          </p>
        </div>
        <div className="relative w-full sm:w-64">
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
            {searchQuery ? "No tenants found" : "No tenants yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search query"
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
      />
    </div>
  );
}
