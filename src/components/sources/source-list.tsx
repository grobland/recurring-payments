"use client";

import { FileStack } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SourceRow } from "./source-row";
import { StatementList } from "./statement-list";
import type { SourceCoverage } from "@/types/source";

interface SourceListProps {
  /** Array of source coverage data */
  sources: SourceCoverage[];
}

/**
 * Accordion-based list of statement sources.
 * Each source expands to show its statements.
 */
export function SourceList({ sources }: SourceListProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileStack className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No statement sources found</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Import statements to get started. Your imported statements will be organized by source.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {sources.map((source) => (
        <AccordionItem key={source.sourceType} value={source.sourceType}>
          <AccordionTrigger className="hover:no-underline">
            <SourceRow source={source} />
          </AccordionTrigger>
          <AccordionContent>
            <StatementList sourceType={source.sourceType} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default SourceList;
