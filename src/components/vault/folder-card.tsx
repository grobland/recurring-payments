"use client";

import { useState } from "react";
import { FolderOpen, FolderClosed, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { SourceCoverage } from "@/types/source";
import { FolderStatements } from "@/components/vault/folder-statements";

interface FolderCardProps {
  source: SourceCoverage;
}

export function FolderCard({ source }: FolderCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full rounded-xl border p-4 text-left",
            "hover:bg-muted/50 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              {open ? (
                <FolderOpen className="size-5 shrink-0 text-primary mt-0.5" />
              ) : (
                <FolderClosed className="size-5 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {source.sourceType}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {source.statementCount}{" "}
                  {source.statementCount === 1 ? "statement" : "statements"} •{" "}
                  {source.transactionCount}{" "}
                  {source.transactionCount === 1
                    ? "transaction"
                    : "transactions"}
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200 mt-0.5",
                open && "rotate-180"
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t mt-2 pt-2">
          <FolderStatements sourceType={source.sourceType} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
