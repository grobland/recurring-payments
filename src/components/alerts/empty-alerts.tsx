import { Bell } from "lucide-react";

export function EmptyAlerts() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Bell className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium">No alerts</p>
      <p className="text-xs text-muted-foreground mt-1">
        You&apos;re all caught up!
      </p>
    </div>
  );
}
