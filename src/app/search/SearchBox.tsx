"use client";

import { useSearchBox } from "react-instantsearch";
import { Input } from "~/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_QUERY = "apartment";

export function SearchBox({ defaultValue }: { defaultValue?: string }) {
  const { query, refine } = useSearchBox();
  const initialValue = defaultValue || DEFAULT_QUERY;
  const [inputValue, setInputValue] = useState(initialValue);

  // Sync with URL on mount - use default if no query provided
  useEffect(() => {
    if (!query) {
      refine(initialValue);
    }
  }, [refine, initialValue, query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    refine(value);
  };

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-3 z-10 h-5 w-5 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search for properties..."
        className="h-12 w-full pl-10"
        value={inputValue}
        onChange={handleChange}
      />
    </div>
  );
}
