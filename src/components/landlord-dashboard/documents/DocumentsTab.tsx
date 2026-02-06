"use client";

import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { PropertyDocumentsSection } from "./PropertyDocumentsSection";
import type { DocumentWithDetails, PropertyWithUnits } from "~/types/landlord";

interface DocumentsTabProps {
  documents: DocumentWithDetails[];
  properties: PropertyWithUnits[];
}

const documentTypes = [
  { value: "government_id", label: "Government ID" },
  { value: "proof_of_income", label: "Proof of Income" },
  { value: "employment_verification", label: "Employment Verification" },
  { value: "rental_history", label: "Rental History" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "reference_letter", label: "Reference Letter" },
  { value: "other", label: "Other" },
];

export function DocumentsTab({ documents, properties }: DocumentsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const availableUnits = propertyFilter === "all"
    ? properties.flatMap((p) => p.units.map((u) => ({ ...u, propertyName: p.name })))
    : (properties.find((p) => p.id.toString() === propertyFilter)?.units.map((u) => ({ ...u, propertyName: undefined })) ?? []);

  const handlePropertyFilterChange = (value: string) => {
    setPropertyFilter(value);
    setUnitFilter("all");
  };

  const filteredDocuments = documents.filter((doc) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      doc.fileName.toLowerCase().includes(searchLower) ||
      doc.tenant?.first_name.toLowerCase().includes(searchLower) ||
      doc.tenant?.last_name.toLowerCase().includes(searchLower);
    const matchesProperty =
      propertyFilter === "all" || doc.property?.id.toString() === propertyFilter;
    const matchesUnit =
      unitFilter === "all" || doc.unit?.id.toString() === unitFilter;
    const matchesType = typeFilter === "all" || doc.documentType === typeFilter;

    return matchesSearch && matchesProperty && matchesUnit && matchesType;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setPropertyFilter("all");
    setUnitFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters =
    searchQuery !== "" || propertyFilter !== "all" || unitFilter !== "all" || typeFilter !== "all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
          <p className="text-muted-foreground">
            View tenant documents and lease agreements
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
        </div>

        <Select value={propertyFilter} onValueChange={handlePropertyFilterChange}>
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

        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {availableUnits.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.propertyName ? `${unit.propertyName} - ${unit.name}` : unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Document Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {documentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
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

      {/* Document List */}
      <PropertyDocumentsSection documents={filteredDocuments} />
    </div>
  );
}
