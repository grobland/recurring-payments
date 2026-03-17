"use client";

import { useState, useEffect } from "react";
import { FolderOpen, CalendarDays, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useSources } from "@/lib/hooks/use-sources";
import { useVaultTimeline } from "@/lib/hooks/use-vault-timeline";
import { FileCabinetView } from "@/components/vault/file-cabinet-view";
import { VaultEmptyState } from "@/components/vault/vault-empty-state";
import { VaultStatsBar } from "@/components/vault/vault-stats-bar";
import { TimelineView } from "@/components/vault/timeline-view";
import { CoverageView } from "@/components/vault/coverage-view";

const VAULT_VIEW_KEY = "vault-view-preference";

export function VaultPage() {
  const { data, isLoading } = useSources();
  const sources = data?.sources ?? [];

  const [activeTab, setActiveTab] = useState("coverage");

  useEffect(() => {
    const saved = localStorage.getItem(VAULT_VIEW_KEY);
    if (saved === "file-cabinet" || saved === "timeline" || saved === "coverage") {
      setActiveTab(saved);
    }
  }, []);

  // Timeline data for stats bar (fetched alongside sources)
  const { data: timelineData } = useVaultTimeline();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Empty state: no sources at all (use sources count, not timeline data)
  if (sources.length === 0) {
    return <VaultEmptyState />;
  }

  return (
    <div className="space-y-0">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">
          View of documents loaded into the vault
        </h2>
        <p className="text-muted-foreground">
          Shows documents loaded by account and by month.
        </p>
      </div>

      {/* Stats bar — only shown when timeline data is loaded and user has statements */}
      {timelineData && timelineData.totalStatements > 0 && (
        <VaultStatsBar
          totalSources={timelineData.totalSources}
          totalStatements={timelineData.totalStatements}
          totalPdfs={timelineData.totalPdfs}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); localStorage.setItem(VAULT_VIEW_KEY, v); }}>
        <TabsList>
          <TabsTrigger value="coverage">
            <BarChart3 className="size-4 mr-1.5" />
            Coverage
          </TabsTrigger>
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
          <TimelineView />
        </TabsContent>
        <TabsContent value="coverage">
          <CoverageView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
