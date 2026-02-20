"use client";

import type { SourceCoverage } from "@/types/source";
import { FolderCard } from "@/components/vault/folder-card";

interface FileCabinetViewProps {
  sources: SourceCoverage[];
}

export function FileCabinetView({ sources }: FileCabinetViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
      {sources.map((source) => (
        <FolderCard key={source.sourceType} source={source} />
      ))}
    </div>
  );
}
