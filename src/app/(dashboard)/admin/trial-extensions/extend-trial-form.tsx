"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface TrialUser {
  id: string;
  email: string;
  name: string | null;
  trialEndDate: Date | null;
}

interface ExtendTrialFormProps {
  users: TrialUser[];
}

export function ExtendTrialForm({ users }: ExtendTrialFormProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [daysToAdd, setDaysToAdd] = useState<string>("7");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }

    const days = parseInt(daysToAdd, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      setError("Days must be between 1 and 365");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/trial-extensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          daysToAdd: days,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to extend trial");
        return;
      }

      setSuccess(
        `Extended trial for ${data.email} by ${days} days. New end date: ${format(new Date(data.newTrialEndDate), "MMM d, yyyy")}`
      );

      // Reset form
      setSelectedUserId("");
      setDaysToAdd("7");
      setReason("");

      // Refresh the page to show new extension in list
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* User Select */}
        <div className="space-y-2">
          <Label htmlFor="user">Trial User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user">
              <SelectValue placeholder="Select a trial user..." />
            </SelectTrigger>
            <SelectContent>
              {users.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  No trial users available
                </SelectItem>
              ) : (
                users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                    {user.name && ` (${user.name})`}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedUser?.trialEndDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Current trial ends:{" "}
              {format(new Date(selectedUser.trialEndDate), "MMM d, yyyy")}
            </p>
          )}
        </div>

        {/* Days Input */}
        <div className="space-y-2">
          <Label htmlFor="days">Days to Add</Label>
          <Input
            id="days"
            type="number"
            min="1"
            max="365"
            value={daysToAdd}
            onChange={(e) => setDaysToAdd(e.target.value)}
            placeholder="7"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            1-365 days
          </p>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason (optional)</Label>
          <Input
            id="reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Engaged user, feedback provided"
            maxLength={200}
          />
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
          {success}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || users.length === 0}>
        {isSubmitting ? "Extending..." : "Extend Trial"}
      </Button>
    </form>
  );
}
