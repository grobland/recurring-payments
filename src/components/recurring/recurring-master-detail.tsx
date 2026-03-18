"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Pencil,
  ArrowLeft,
  ExternalLink,
  GitMerge,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import {
  useRecurringMasterDetail,
  useUpdateMaster,
  useChangeMasterStatus,
  useMergeMasters,
  useRecurringMasters,
} from "@/lib/hooks/use-recurring";
import { useDelayedLoading } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { updateMasterSchema, type UpdateMasterInput } from "@/lib/validations/recurring";

// ============ Types ============

type MasterStatus = "active" | "paused" | "cancelled" | "dormant" | "needs_review";

type SeriesLink = {
  id: string;
  detectedFrequency: string | null;
  avgAmount: string | null;
  currency: string;
  confidence: string | null;
  transactionCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
  isPrimary: boolean;
  linkedAt: string;
};

type RecurringEvent = {
  id: string;
  eventType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type MasterDetail = {
  id: string;
  name: string;
  recurringKind: string;
  status: MasterStatus;
  expectedAmount: string | null;
  currency: string;
  billingFrequency: string | null;
  billingDayOfMonth: number | null;
  importanceRating: number | null;
  confidence: string | null;
  nextExpectedDate: string | null;
  url: string | null;
  notes: string | null;
  description: string | null;
  merchantEntityId: string | null;
  merchantName: string | null;
  createdAt: string;
  updatedAt: string;
  series: SeriesLink[];
  events: RecurringEvent[];
};

type MasterListItem = {
  id: string;
  name: string;
  recurringKind: string;
  status: MasterStatus;
};

// ============ Helper Components ============

function StatusBadge({ status }: { status: MasterStatus }) {
  const classes: Record<MasterStatus, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    dormant: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    needs_review: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  const label = status.replace("_", " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${classes[status]}`}
    >
      {label}
    </span>
  );
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <Badge variant="outline" className="capitalize">
      {kind.replace("_", " ")}
    </Badge>
  );
}

// ============ Edit Dialog ============

const RECURRING_KIND_OPTIONS = [
  { value: "subscription", label: "Subscription" },
  { value: "utility", label: "Utility" },
  { value: "insurance", label: "Insurance" },
  { value: "loan", label: "Loan" },
  { value: "rent_mortgage", label: "Rent / Mortgage" },
  { value: "membership", label: "Membership" },
  { value: "installment", label: "Installment" },
  { value: "other_recurring", label: "Other Recurring" },
];

const BILLING_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "weekly", label: "Weekly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "custom", label: "Custom" },
];

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  master: MasterDetail;
  onSave: (data: UpdateMasterInput) => void;
  isSaving: boolean;
}

function EditDialog({ open, onClose, master, onSave, isSaving }: EditDialogProps) {
  const form = useForm<UpdateMasterInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(updateMasterSchema) as any,
    defaultValues: {
      name: master.name,
      recurringKind: master.recurringKind as UpdateMasterInput["recurringKind"],
      description: master.description ?? "",
      expectedAmount: master.expectedAmount ? parseFloat(master.expectedAmount) : undefined,
      billingFrequency: (master.billingFrequency as UpdateMasterInput["billingFrequency"]) ?? undefined,
      billingDayOfMonth: master.billingDayOfMonth ?? undefined,
      importanceRating: master.importanceRating ?? undefined,
      url: master.url ?? "",
      notes: master.notes ?? "",
    },
  });

  const handleSubmit = (data: UpdateMasterInput) => {
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Recurring Payment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Netflix" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recurringKind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kind</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select kind" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RECURRING_KIND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="Brief description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expectedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BILLING_FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingDayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Day of Month</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="e.g. 15"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="importanceRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importance (1-5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        placeholder="e.g. 3"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} placeholder="https://example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} placeholder="Additional notes..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ============ Merge Dialog ============

interface MergeDialogProps {
  open: boolean;
  onClose: () => void;
  currentId: string;
  masters: MasterListItem[];
  onMerge: (targetId: string) => void;
  isMerging: boolean;
}

function MergeDialog({ open, onClose, currentId, masters, onMerge, isMerging }: MergeDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const otherMasters = masters.filter((m) => m.id !== currentId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge into Another Master</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This recurring payment will be merged into the selected target. The current item will be deleted and all linked series will be moved.
          </p>
          {otherMasters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No other recurring masters available.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {otherMasters.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedId === m.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="merge-target"
                    value={m.id}
                    checked={selectedId === m.id}
                    onChange={() => setSelectedId(m.id)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.recurringKind.replace("_", " ")}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!selectedId || isMerging}
            onClick={() => onMerge(selectedId)}
          >
            {isMerging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main Component ============

interface RecurringMasterDetailProps {
  id: string;
}

export function RecurringMasterDetail({ id }: RecurringMasterDetailProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const { data: response, isLoading, error } = useRecurringMasterDetail(id);
  const { data: mastersResponse } = useRecurringMasters({});
  const showSkeleton = useDelayedLoading(isLoading);
  const updateMaster = useUpdateMaster();
  const changeMasterStatus = useChangeMasterStatus();
  const mergeMasters = useMergeMasters();

  if (showSkeleton) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl text-center py-16">
          <h2 className="text-2xl font-bold">Unable to load</h2>
          <p className="mt-2 text-muted-foreground">There was a problem loading this recurring payment.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/recurring">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recurring
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const master = (response as { data?: MasterDetail } | undefined)?.data;

  if (!master) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl text-center py-16">
          <h2 className="text-2xl font-bold">Recurring item not found</h2>
          <p className="mt-2 text-muted-foreground">
            This recurring payment does not exist or has been deleted.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/recurring">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recurring
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const allMasters = (mastersResponse as { data?: { items?: MasterListItem[] } } | undefined)?.data?.items ?? [];
  const status = master.status;

  const handleStatusChange = (newStatus: MasterStatus) => {
    changeMasterStatus.mutate({ id, data: { status: newStatus } });
  };

  const handleSaveEdit = (data: UpdateMasterInput) => {
    updateMaster.mutate(
      { id, data },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const handleMerge = (targetId: string) => {
    mergeMasters.mutate(
      { id, data: { mergeIntoId: targetId } },
      {
        onSuccess: () => {
          setMergeOpen(false);
          router.push(`/recurring/${targetId}`);
        },
      }
    );
  };

  const confidencePercent = master.confidence
    ? `${Math.round(parseFloat(master.confidence) * 100)}%`
    : null;

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{master.name}</h1>
              <KindBadge kind={master.recurringKind} />
              <StatusBadge status={status} />
            </div>
            {master.merchantName && (
              <p className="text-sm text-muted-foreground">Merchant: {master.merchantName}</p>
            )}
            {master.description && (
              <p className="text-muted-foreground">{master.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="shrink-0"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>

        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {master.expectedAmount && (
                <div>
                  <p className="text-sm text-muted-foreground">Expected Amount</p>
                  <p className="font-semibold">
                    {formatCurrency(parseFloat(master.expectedAmount), master.currency)}
                  </p>
                </div>
              )}
              {master.billingFrequency && (
                <div>
                  <p className="text-sm text-muted-foreground">Billing Frequency</p>
                  <p className="font-semibold capitalize">{master.billingFrequency}</p>
                </div>
              )}
              {master.billingDayOfMonth && (
                <div>
                  <p className="text-sm text-muted-foreground">Billing Day</p>
                  <p className="font-semibold">Day {master.billingDayOfMonth}</p>
                </div>
              )}
              {master.importanceRating && (
                <div>
                  <p className="text-sm text-muted-foreground">Importance</p>
                  <p className="font-semibold">{master.importanceRating} / 5</p>
                </div>
              )}
              {confidencePercent && (
                <div>
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="font-semibold">{confidencePercent}</p>
                </div>
              )}
              {master.nextExpectedDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Next Expected</p>
                  <p className="font-semibold">
                    {format(new Date(master.nextExpectedDate), "PPP")}
                  </p>
                </div>
              )}
              {master.url && (
                <div>
                  <p className="text-sm text-muted-foreground">URL</p>
                  <a
                    href={master.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    {master.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {master.notes && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{master.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Actions */}
        <div className="flex flex-wrap gap-2">
          {status === "active" && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Pause</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pause this recurring payment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark "{master.name}" as paused. You can reactivate it at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange("paused")}>
                      Pause
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Cancel</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this recurring payment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark "{master.name}" as cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Active</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange("cancelled")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Payment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {status === "paused" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("active")}
                disabled={changeMasterStatus.isPending}
              >
                {changeMasterStatus.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Reactivate
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Cancel</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this recurring payment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark "{master.name}" as cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Paused</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange("cancelled")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Payment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {(status === "cancelled" || status === "dormant") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("active")}
              disabled={changeMasterStatus.isPending}
            >
              {changeMasterStatus.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Reactivate
            </Button>
          )}
          {status === "needs_review" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("active")}
                disabled={changeMasterStatus.isPending}
              >
                {changeMasterStatus.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Activate
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">Cancel</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this recurring payment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark "{master.name}" as cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange("cancelled")}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Payment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {/* Merge always visible */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMergeOpen(true)}
          >
            <GitMerge className="mr-2 h-3 w-3" />
            Merge
          </Button>
        </div>

        {/* Linked Series Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Linked Series</CardTitle>
          </CardHeader>
          <CardContent>
            {master.series.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked series yet.</p>
            ) : (
              <div className="space-y-3">
                {master.series.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {s.detectedFrequency && (
                        <Badge variant="secondary" className="capitalize">
                          {s.detectedFrequency}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {s.transactionCount} transactions
                      </Badge>
                      {s.isPrimary && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Primary
                        </Badge>
                      )}
                      {!s.isActive && (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {s.avgAmount && (
                      <p className="text-sm">
                        Avg: {formatCurrency(parseFloat(s.avgAmount), s.currency)}
                      </p>
                    )}
                    {(s.firstSeenAt || s.lastSeenAt) && (
                      <p className="text-xs text-muted-foreground">
                        {s.firstSeenAt ? format(new Date(s.firstSeenAt), "MMM d, yyyy") : "?"}
                        {" "}&ndash;{" "}
                        {s.lastSeenAt ? format(new Date(s.lastSeenAt), "MMM d, yyyy") : "present"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Log Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {master.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {master.events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-2 border-b last:border-b-0">
                    <div className="shrink-0 pt-0.5">
                      <Badge variant="outline" className="capitalize text-xs">
                        {event.eventType.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {Object.entries(event.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{" "}
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "PPP p")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Dialogs */}
      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        master={master}
        onSave={handleSaveEdit}
        isSaving={updateMaster.isPending}
      />
      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        currentId={id}
        masters={allMasters}
        onMerge={handleMerge}
        isMerging={mergeMasters.isPending}
      />
    </main>
  );
}
