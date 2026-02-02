"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AccountComboboxProps {
  value: string;
  onChange: (value: string) => void;
  previousAccounts: string[];
  disabled?: boolean;
}

export function AccountCombobox({
  value,
  onChange,
  previousAccounts,
  disabled = false,
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Contains-match filtering (case-insensitive)
  const filtered = previousAccounts.filter((account) =>
    account.toLowerCase().includes(search.toLowerCase())
  );

  // Show "Create [name]" option when typing new account that doesn't exist
  const showCreateOption =
    search.trim().length > 0 &&
    !filtered.some((acc) => acc.toLowerCase() === search.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? (
            <span className="truncate">{value}</span>
          ) : (
            <span className="text-muted-foreground">
              Select or type account name...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search accounts..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !showCreateOption && (
              <CommandEmpty>Type to create new account</CommandEmpty>
            )}
            <CommandGroup>
              {showCreateOption && (
                <CommandItem
                  value={`create-${search}`}
                  onSelect={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="font-medium"
                >
                  Create &quot;{search}&quot;
                </CommandItem>
              )}
              {filtered.map((account) => (
                <CommandItem
                  key={account}
                  value={account}
                  onSelect={() => {
                    onChange(account);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {account}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
