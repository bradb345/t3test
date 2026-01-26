"use client";

import { Button } from "~/components/ui/button";

interface MaintenanceStatusFilterProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

const filters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function MaintenanceStatusFilter({
  currentFilter,
  onFilterChange,
  counts,
}: MaintenanceStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const count = counts[filter.value as keyof typeof counts];
        return (
          <Button
            key={filter.value}
            variant={currentFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
