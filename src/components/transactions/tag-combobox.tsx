"use client";

import * as React from "react";
import { Check, Tag } from "lucide-react";
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
import { useTags } from "@/lib/hooks/use-tags";

interface TagComboboxProps {
  /** ID of the transaction being tagged */
  transactionId: string;
  /** IDs of tags currently applied to this transaction */
  appliedTagIds: string[];
  /** Callback when a tag is toggled */
  onTagToggle: (tagId: string) => void;
  /** Whether the combobox is disabled */
  disabled?: boolean;
}

/**
 * Inline tag selector popover for tagging transactions.
 * Shows all user's tags with checkmarks on applied tags.
 * Follows the CategoryCombobox pattern from the codebase.
 */
export function TagCombobox({
  transactionId,
  appliedTagIds,
  onTagToggle,
  disabled = false,
}: TagComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const { data: tagsData, isLoading } = useTags();

  const tags = tagsData?.tags ?? [];
  const hasAppliedTags = appliedTagIds.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            hasAppliedTags && "text-primary"
          )}
          disabled={disabled || isLoading}
          aria-label="Manage tags"
        >
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>
              {tags.length === 0
                ? "No tags. Create tags in Settings."
                : "No tags found."}
            </CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const isApplied = appliedTagIds.includes(tag.id);
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      onTagToggle(tag.id);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isApplied ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span
                      className="mr-2 h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
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
