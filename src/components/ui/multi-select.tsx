"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "~/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  className = "",
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Ensure we're working with arrays - memoized to avoid dependency issues
  const safeOptions = React.useMemo(
    () => (Array.isArray(options) ? options : []),
    [options]
  );
  const safeSelected = React.useMemo(
    () => (Array.isArray(selected) ? selected : []),
    [selected]
  );

  const handleUnselect = React.useCallback((item: string) => {
    onChange(safeSelected.filter((i) => i !== item));
  }, [safeSelected, onChange]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "" && safeSelected.length > 0) {
            onChange(safeSelected.slice(0, -1));
          }
        }
        if (e.key === "Escape") {
          input.blur();
          setOpen(false);
        }
      }
    },
    [safeSelected, onChange]
  );

  const handleSelect = React.useCallback((item: string) => {
    onChange([...safeSelected, item]);
    // Keep focus and dropdown open after selection
    inputRef.current?.focus();
    setOpen(true);
    setInputValue("");
  }, [safeSelected, onChange]);

  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    // Check if the new focused element is within our component
    const commandEl = e.currentTarget.closest('.multi-select-container');
    const newFocusedEl = e.relatedTarget;
    
    if (commandEl && !commandEl.contains(newFocusedEl)) {
      setOpen(false);
    }
  }, []);

  const selectables = React.useMemo(() => {
    return safeOptions
      .filter((item) => !safeSelected.includes(item))
      .filter((item) =>
        item.toLowerCase().includes(inputValue.toLowerCase())
      );
  }, [safeOptions, safeSelected, inputValue]);

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={`overflow-visible bg-transparent ${className} multi-select-container`}
    >
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {safeSelected.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(item);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={handleBlur}
            onFocus={() => setOpen(true)}
            placeholder={!safeSelected.length ? placeholder : undefined}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ? (
          <div 
            className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in"
            onMouseDown={(e) => {
              // Prevent blur when clicking the dropdown
              e.preventDefault();
            }}
          >
            <CommandGroup className="h-full overflow-auto max-h-[200px]">
              {selectables.map((item) => (
                <CommandItem
                  key={item}
                  onSelect={() => handleSelect(item)}
                  className="cursor-pointer"
                >
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  );
} 