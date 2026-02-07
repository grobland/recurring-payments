"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertItem } from "./alert-item";
import { EmptyAlerts } from "./empty-alerts";
import {
  useAlerts,
  useHasUnreadAlerts,
  useAcknowledgeAlert,
  useDismissAlert,
  useDismissAllAlerts,
} from "@/lib/hooks/use-alerts";
import { Skeleton } from "@/components/ui/skeleton";

const DROPDOWN_LIMIT = 5;

export function NotificationBell() {
  const { data, isLoading, error } = useAlerts();
  const hasUnread = useHasUnreadAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const dismissAlert = useDismissAlert();
  const dismissAllAlerts = useDismissAllAlerts();

  const alerts = data?.alerts ?? [];
  const displayedAlerts = alerts.slice(0, DROPDOWN_LIMIT);
  const hasMoreAlerts = alerts.length > DROPDOWN_LIMIT;

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert.mutate(id);
  };

  const handleDismiss = (id: string) => {
    dismissAlert.mutate(id);
  };

  const handleDismissAll = () => {
    dismissAllAlerts.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={hasUnread ? "Notifications (unread)" : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {alerts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleDismissAll}
              disabled={dismissAllAlerts.isPending}
            >
              Dismiss all
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {/* Alert list */}
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-2 w-2 rounded-full mt-2" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-center text-muted-foreground">
            Failed to load alerts
          </div>
        ) : alerts.length === 0 ? (
          <EmptyAlerts />
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-2 space-y-1">
              {displayedAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onDismiss={handleDismiss}
                  isLoading={
                    acknowledgeAlert.isPending || dismissAlert.isPending
                  }
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer with View all link */}
        {hasMoreAlerts && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Link
                href="/alerts"
                className="block w-full text-center text-sm text-primary hover:underline py-2"
              >
                View all ({alerts.length})
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
