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
import { useAccounts } from "@/lib/hooks/use-accounts";

interface AccountComboboxProps {
  /** Selected account ID (UUID) */
  value: string;
  /** Called with account ID when selection changes */
  onChange: (accountId: string) => void;
  disabled?: boolean;
}

export function AccountCombobox({
  value,
  onChange,
  disabled = false,
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useAccounts();

  const accounts = data?.accounts ?? [];

  // Contains-match filtering (case-insensitive)
  const filtered = accounts.filter((account) =>
    account.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedAccount = accounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {selectedAccount ? (
            <span className="truncate">
              {selectedAccount.name}
              {selectedAccount.institution
                ? ` — ${selectedAccount.institution}`
                : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {isLoading ? "Loading accounts..." : "Select account..."}
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
            {filtered.length === 0 && (
              <CommandEmpty>No accounts found</CommandEmpty>
            )}
            <CommandGroup>
              {filtered.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => {
                    onChange(account.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <span className="font-medium">{account.name}</span>
                    {account.institution && (
                      <span className="ml-1.5 text-muted-foreground">
                        — {account.institution}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
