"use client";

import * as React from "react";
import { Tag, X } from "lucide-react";
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

interface BulkActionBarProps {
  /** Number of selected items */
  count: number;
  /** Callback when a tag is selected to apply */
  onTag: (tagId: string) => void;
  /** Callback to clear selection */
  onClear: () => void;
}

/**
 * Floating action bar for bulk operations on selected transactions.
 * Appears at the bottom of the screen when items are selected.
 */
export function BulkActionBar({ count, onTag, onClear }: BulkActionBarProps) {
  const [open, setOpen] = React.useState(false);
  const { data: tagsData, isLoading } = useTags();

  const tags = tagsData?.tags ?? [];

  const handleTagSelect = (tagId: string) => {
    onTag(tagId);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 bg-background border rounded-lg shadow-lg px-4 py-3">
        {/* Selection count */}
        <span className="text-sm font-medium">
          {count} item{count === 1 ? "" : "s"} selected
        </span>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Tag action */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isLoading}
            >
              <Tag className="h-4 w-4" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="center">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>
                  {tags.length === 0
                    ? "No tags. Create tags in Settings."
                    : "No tags found."}
                </CommandEmpty>
                <CommandGroup>
                  {tags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => handleTagSelect(tag.id)}
                    >
                      <span
                        className="mr-2 h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClear}
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
