"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Bell,
  BellOff,
  Check,
  X,
  AlertCircle,
  Clock,
  Mail,
  Loader2,
} from "lucide-react";

import { DashboardHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ReminderSettings {
  emailRemindersEnabled: boolean;
  reminderDaysBefore: number[];
}

interface ReminderLog {
  id: string;
  status: "sent" | "failed" | "pending";
  scheduledFor: string;
  sentAt: string | null;
  emailSubject: string | null;
  errorMessage: string | null;
  createdAt: string;
  subscription: {
    id: string;
    name: string;
  } | null;
}

const REMINDER_DAY_OPTIONS = [
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "7 days before" },
  { value: 14, label: "14 days before" },
  { value: 30, label: "30 days before" },
];

export default function RemindersPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/reminders");
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  // Fetch logs
  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch("/api/reminders/logs?limit=20");
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLoadingLogs(false);
      }
    }
    fetchLogs();
  }, []);

  const updateSettings = async (updates: Partial<ReminderSettings>) => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/reminders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        toast.success("Settings saved");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleReminderDay = (day: number) => {
    if (!settings) return;

    const currentDays = settings.reminderDaysBefore;
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => b - a);

    updateSettings({ reminderDaysBefore: newDays });
  };

  return (
    <>
      <DashboardHeader
        title="Reminders"
        breadcrumbs={[
          { label: "subs Dash", href: "/payments/dashboard" },
          { label: "Reminders" },
        ]}
      />
      <main className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reminders</h2>
          <p className="text-muted-foreground">
            Configure when and how you receive renewal reminders
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Reminder Settings
              </CardTitle>
              <CardDescription>
                Choose when to receive email reminders before renewals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSettings ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : settings ? (
                <>
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      {settings.emailRemindersEnabled ? (
                        <Bell className="h-5 w-5 text-primary" />
                      ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Email Reminders</p>
                        <p className="text-sm text-muted-foreground">
                          Receive emails before subscriptions renew
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.emailRemindersEnabled}
                      onCheckedChange={(checked) =>
                        updateSettings({ emailRemindersEnabled: checked })
                      }
                      disabled={isSaving}
                    />
                  </div>

                  {/* Reminder Days */}
                  {settings.emailRemindersEnabled && (
                    <div className="space-y-3">
                      <Label>Remind me before renewal:</Label>
                      <div className="space-y-2">
                        {REMINDER_DAY_OPTIONS.map((option) => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`day-${option.value}`}
                              checked={settings.reminderDaysBefore.includes(
                                option.value
                              )}
                              onCheckedChange={() =>
                                toggleReminderDay(option.value)
                              }
                              disabled={isSaving}
                            />
                            <Label
                              htmlFor={`day-${option.value}`}
                              className="cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {settings.reminderDaysBefore.length === 0 && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          <AlertCircle className="mr-1 inline h-4 w-4" />
                          Select at least one reminder time
                        </p>
                      )}
                    </div>
                  )}

                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Failed to load settings
                </p>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                We'll send you an email reminder before your subscriptions
                renew based on your settings above.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  Reminders are sent daily at 9:00 AM (UTC)
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  Multiple subscriptions renewing on the same day are combined
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-green-500" />
                  You can snooze or skip individual reminders
                </li>
              </ul>
              <p>
                You can also disable reminders for individual subscriptions
                from their edit page.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reminder History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Reminders
            </CardTitle>
            <CardDescription>
              History of reminder emails sent to you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="mx-auto h-12 w-12 opacity-20" />
                <p className="mt-4">No reminders sent yet</p>
                <p className="text-sm">
                  Reminders will appear here once they're sent
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          log.status === "sent"
                            ? "bg-green-100 dark:bg-green-900"
                            : log.status === "failed"
                            ? "bg-red-100 dark:bg-red-900"
                            : "bg-yellow-100 dark:bg-yellow-900"
                        }`}
                      >
                        {log.status === "sent" ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : log.status === "failed" ? (
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {log.subscription?.name ?? "Unknown subscription"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.emailSubject ?? "Reminder email"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          log.status === "sent"
                            ? "default"
                            : log.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {log.status}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.sentAt
                          ? format(new Date(log.sentAt), "MMM d, yyyy h:mm a")
                          : format(new Date(log.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
