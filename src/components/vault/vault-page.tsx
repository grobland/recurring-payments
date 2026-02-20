"use client";

import { FolderOpen, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSources } from "@/lib/hooks/use-sources";
import { FileCabinetView } from "@/components/vault/file-cabinet-view";
import { VaultEmptyState } from "@/components/vault/vault-empty-state";

export function VaultPage() {
  const { data, isLoading } = useSources();
  const sources = data?.sources ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return <VaultEmptyState />;
  }

  return (
    <Tabs defaultValue="file-cabinet">
      <TabsList>
        <TabsTrigger value="file-cabinet">
          <FolderOpen className="size-4 mr-1.5" />
          File Cabinet
        </TabsTrigger>
        <TabsTrigger value="timeline">
          <CalendarDays className="size-4 mr-1.5" />
          Timeline
        </TabsTrigger>
      </TabsList>
      <TabsContent value="file-cabinet">
        <FileCabinetView sources={sources} />
      </TabsContent>
      <TabsContent value="timeline">
        <div className="py-12 text-center text-sm text-muted-foreground">
          Timeline view coming soon
        </div>
      </TabsContent>
    </Tabs>
  );
}
