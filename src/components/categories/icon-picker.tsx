"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
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

// Popular/common icons for categories - curated subset for better UX
const POPULAR_ICONS = [
  "circle", "star", "heart", "music", "film", "tv", "gamepad-2", "book",
  "newspaper", "cloud", "database", "server", "code", "laptop", "smartphone",
  "headphones", "camera", "image", "video", "mic", "radio", "wifi",
  "shopping-cart", "credit-card", "wallet", "dollar-sign", "trending-up",
  "home", "building", "car", "plane", "train", "bike", "utensils", "coffee",
  "dumbbell", "heart-pulse", "pill", "graduation-cap", "briefcase", "wrench",
  "shield", "lock", "key", "mail", "message-circle", "phone", "globe",
] as const;

// Get all Lucide icon names for search
const ALL_ICON_NAMES = Object.keys(LucideIcons).filter(
  (name) =>
    name !== "createLucideIcon" &&
    !name.startsWith("Lucide") &&
    typeof (LucideIcons as Record<string, unknown>)[name] === "function"
);

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Show popular icons by default, full search results when searching
  const displayedIcons = React.useMemo(() => {
    if (!search) {
      return POPULAR_ICONS.map(String);
    }
    const searchLower = search.toLowerCase();
    return ALL_ICON_NAMES
      .filter((name) => name.toLowerCase().includes(searchLower))
      .slice(0, 50); // Limit for performance
  }, [search]);

  // Convert icon name to component
  const getIconComponent = (name: string) => {
    const pascalName = name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    return (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  };

  const SelectedIcon = getIconComponent(value);

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
          <div className="flex items-center gap-2">
            {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
            <span className="truncate">{value}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search icons..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No icons found.</CommandEmpty>
            <CommandGroup heading={search ? "Search Results" : "Popular Icons"}>
              {displayedIcons.map((iconName) => {
                const Icon = getIconComponent(iconName);
                if (!Icon) return null;
                return (
                  <CommandItem
                    key={iconName}
                    value={iconName}
                    onSelect={() => {
                      onChange(iconName);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === iconName ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{iconName}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
