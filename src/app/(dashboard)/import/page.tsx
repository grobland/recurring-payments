"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { format, addMonths, formatDistanceToNow, parse, isValid } from "date-fns";
import {
  Upload,
  FileText,
  X,
  Loader2,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { calculateRenewalFromTransaction, parseDateFromAI } from "@/lib/utils/dates";

import { DashboardHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AccountCombobox } from "@/components/import/account-combobox";
import { EmptyState } from "@/components/shared/empty-state";
import { DuplicateWarning } from "@/components/subscriptions/duplicate-warning";
import { DuplicateComparison } from "@/components/subscriptions/duplicate-comparison";
import { useCategoryOptions, useImportHistory } from "@/lib/hooks";
import { useAccounts } from "@/lib/hooks/use-accounts";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errors";

/**
 * Interface for enhanced duplicate match info from API
 */
interface DuplicateMatch {
  existingId: string;
  existingName: string;
  existingAmount: string;
  existingCurrency: string;
  existingFrequency: string;
  score: number;
  matches: Record<string, boolean>;
}

interface DetectedSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  confidence: number;
  duplicateMatch?: DuplicateMatch | null;  // Enhanced duplicate info from API
  transactionDate?: string | null;  // ISO string from AI
  dateFound?: boolean;
}

interface ImportItem extends DetectedSubscription {
  selected: boolean;
  categoryId: string | null;
  nextRenewalDate: Date;
  action: "create" | "skip" | "merge";
  mergeWithId: string | null;  // For merge action - ID of existing subscription to merge with
  showComparison: boolean;     // Whether to show the duplicate comparison view
  // Transaction date state
  transactionDateValue: Date | null;      // Current value (edited or original)
  originalTransactionDate: Date | null;   // Original AI value for diff
  transactionDateEdited: boolean;         // Was it manually edited?
  // Renewal date state
  renewalDateValue: Date | null;          // Current value (edited or original)
  originalRenewalDate: Date | null;       // Original calculated value for diff
  renewalDateEdited: boolean;             // Was it manually edited?
}

type Step = "upload" | "processing" | "review" | "complete";
type ProcessingStatus = "uploading" | "analyzing" | "extracting" | null;

function ConfidenceBadge({ score }: { score: number }) {
  const safeScore = typeof score === "number" && !isNaN(score) ? score : 50;
  // Thresholds match AI prompt: 80-100 (high), 50-79 (medium), 0-49 (low)
  const variant = safeScore >= 80 ? "success" : safeScore >= 50 ? "warning" : "destructive";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant}>{safeScore}%</Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>AI confidence this is a recurring subscription</p>
      </TooltipContent>
    </Tooltip>
  );
}

function DateConfidenceBadge({ dateFound }: { dateFound: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {dateFound ? (
          <Badge variant="success" className="text-xs">Date found</Badge>
        ) : (
          <Badge variant="warning" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Date not found
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p>{dateFound ? "Transaction date extracted from statement" : "Date not found in statement - using today as basis"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface EditableDateFieldProps {
  value: Date | null;
  originalValue: Date | null;
  wasEdited: boolean;
  dateNotFound?: boolean;
  onSave: (date: Date | null) => void;
  onRevert?: () => void;
  label: string;
}

function EditableDateField({
  value,
  originalValue,
  wasEdited,
  dateNotFound,
  onSave,
  onRevert,
  label,
}: EditableDateFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Initialize input value when starting to edit
  const startEditing = () => {
    setInputValue(value ? format(value, "MM/dd/yyyy") : "");
    setError(null);
    setIsEditing(true);
  };

  // Validate and save on blur or Enter
  const handleSave = () => {
    if (!inputValue.trim()) {
      onSave(null);
      setIsEditing(false);
      return;
    }

    // Parse the input
    const parsed = parse(inputValue, "MM/dd/yyyy", new Date());

    if (!isValid(parsed)) {
      setError("Invalid date format (MM/DD/YYYY)");
      return;
    }

    // Validate year range (2020-2030)
    const year = parsed.getFullYear();
    if (year < 2020 || year > 2030) {
      setError("Year must be between 2020 and 2030");
      return;
    }

    onSave(parsed);
    setIsEditing(false);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setError(null);
    }
  };

  // Display mode
  if (!isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startEditing}
            className="text-sm text-left hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            {wasEdited && originalValue ? (
              <span>
                <span className="line-through text-muted-foreground mr-2">
                  {format(originalValue, "MMM d, yyyy")}
                </span>
                <span>{value ? format(value, "MMM d, yyyy") : "Not set"}</span>
              </span>
            ) : value ? (
              <span>{format(value, "MMM d, yyyy")}</span>
            ) : (
              <span className="text-yellow-600">Not set</span>
            )}
          </button>
          {wasEdited && onRevert && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={onRevert}
            >
              Restore
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="MM/DD/YYYY"
          className="h-8 w-32"
          autoFocus
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; merged: number } | null>(null);
  const [statementSource, setStatementSource] = useState("");
  const [rawExtractionData, setRawExtractionData] = useState<{
    subscriptions: DetectedSubscription[];
    model: string;
    processingTime: number;
    pageCount: number;
    extractedAt: string;
  } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(null);

  const { options: categoryOptions } = useCategoryOptions();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];
  const { data: importHistoryData, isLoading: isLoadingHistory } = useImportHistory();

  const statusMessages: Record<Exclude<ProcessingStatus, null>, string> = {
    uploading: "Uploading...",
    analyzing: "Analyzing document...",
    extracting: "Extracting subscriptions...",
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    // Clear any status
    setProcessingStatus(null);
    setIsProcessing(false);
    setStep("upload");
  };

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setStep("processing");

    // Set staged status with simulated progress
    setProcessingStatus("uploading");
    const analyzingTimeout = setTimeout(() => {
      setProcessingStatus("analyzing");
    }, 500);
    const extractingTimeout = setTimeout(() => {
      setProcessingStatus("extracting");
    }, 1500);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        clearTimeout(analyzingTimeout);
        clearTimeout(extractingTimeout);
        const errorData = await response.json();
        const errorMessage = errorData.error || "";

        // Map to specific user-friendly messages
        let userMessage = "Unable to process file. Please try again.";

        if (errorMessage.includes("too large") || errorMessage.includes("10MB")) {
          userMessage = "File too large (max 10MB). Please use a smaller file.";
        } else if (errorMessage.includes("Invalid PDF") || errorMessage.includes("invalid format")) {
          userMessage = "Invalid PDF format. Please upload a valid PDF file.";
        } else if (errorMessage.includes("No transactions") || errorMessage.includes("no subscriptions")) {
          userMessage = "No transactions found in this statement. Try a different file or add subscriptions manually.";
        } else if (errorMessage.includes("OpenAI") || errorMessage.includes("AI")) {
          userMessage = "AI service temporarily unavailable. Please try again in a moment.";
        }

        toast.error(userMessage, {
          duration: Infinity,
          action: {
            label: "Try again",
            onClick: () => {
              setStep("upload");
            },
          },
        });

        setProcessingStatus(null);
        setStep("upload");
        return;
      }

      const data = await response.json();
      clearTimeout(analyzingTimeout);
      clearTimeout(extractingTimeout);

      // Store raw extraction data for confirm step
      setRawExtractionData(data.rawExtractionData);

      // Transform detected subscriptions to import items
      const importItems: ImportItem[] = data.subscriptions.map(
        (sub: DetectedSubscription) => {
          const parsedTransactionDate = parseDateFromAI(sub.transactionDate);
          const calculatedRenewal = parsedTransactionDate
            ? calculateRenewalFromTransaction(parsedTransactionDate, sub.frequency)
            : addMonths(new Date(), 1);

          // Determine default action based on duplicate match score
          // 85%+ similarity: Skip by default (conservative)
          // 70-84% similarity: Keep Both by default
          // No duplicate: Create if high confidence
          const hasDuplicate = sub.duplicateMatch && sub.duplicateMatch.score >= 70;
          const isHighSimilarity = sub.duplicateMatch && sub.duplicateMatch.score >= 85;

          let defaultAction: "create" | "skip" | "merge" = "create";
          let defaultSelected = sub.confidence >= 80;

          if (hasDuplicate) {
            if (isHighSimilarity) {
              // 85%+ similarity: Skip by default
              defaultAction = "skip";
              defaultSelected = false;
            } else {
              // 70-84% similarity: Keep Both by default
              defaultAction = "create";
              defaultSelected = sub.confidence >= 80;
            }
          }

          return {
            ...sub,
            selected: defaultSelected,
            categoryId: null,
            nextRenewalDate: calculatedRenewal,
            action: defaultAction,
            mergeWithId: null,
            showComparison: false,
            // Date state
            transactionDateValue: parsedTransactionDate,
            originalTransactionDate: parsedTransactionDate,
            transactionDateEdited: false,
            renewalDateValue: calculatedRenewal,
            originalRenewalDate: calculatedRenewal,
            renewalDateEdited: false,
          };
        }
      );

      setItems(importItems);
      setProcessingStatus(null);
      setStep("review");
    } catch (error) {
      // Network errors
      clearTimeout(analyzingTimeout);
      clearTimeout(extractingTimeout);
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => processFiles(),
        },
      });
      setProcessingStatus(null);
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              selected: !item.selected,
              action: !item.selected ? "create" : "skip",
            }
          : item
      )
    );
  };

  const updateItem = (index: number, updates: Partial<ImportItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const updateTransactionDate = (index: number, newDate: Date | null) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        // Calculate new renewal date from transaction date
        const newRenewal = newDate
          ? calculateRenewalFromTransaction(newDate, item.frequency)
          : addMonths(new Date(), 1);

        return {
          ...item,
          transactionDateValue: newDate,
          transactionDateEdited: true,
          // Auto-recalculate renewal (per CONTEXT.md decision)
          renewalDateValue: newRenewal,
          originalRenewalDate: item.originalRenewalDate, // Keep original for diff
          renewalDateEdited: false, // Clear manual renewal edit when transaction changes
          nextRenewalDate: newRenewal, // Update the actual import value
        };
      })
    );
  };

  const updateRenewalDate = (index: number, newDate: Date | null) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          renewalDateValue: newDate,
          renewalDateEdited: true,
          nextRenewalDate: newDate || item.nextRenewalDate,
        };
      })
    );
  };

  const revertTransactionDate = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        // Recalculate renewal from original transaction date
        const newRenewal = item.originalTransactionDate
          ? calculateRenewalFromTransaction(item.originalTransactionDate, item.frequency)
          : addMonths(new Date(), 1);

        return {
          ...item,
          transactionDateValue: item.originalTransactionDate,
          transactionDateEdited: false,
          renewalDateValue: newRenewal,
          renewalDateEdited: false,
          nextRenewalDate: newRenewal,
        };
      })
    );
  };

  const revertRenewalDate = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          renewalDateValue: item.originalRenewalDate,
          renewalDateEdited: false,
          nextRenewalDate: item.originalRenewalDate || item.nextRenewalDate,
        };
      })
    );
  };

  const toggleComparison = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, showComparison: !item.showComparison } : item
      )
    );
  };

  const setDuplicateAction = (
    index: number,
    action: "create" | "skip" | "merge"
  ) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        if (action === "create") {
          // Keep Both - import as new subscription
          return {
            ...item,
            action: "create",
            selected: true,
            mergeWithId: null,
          };
        } else if (action === "skip") {
          // Skip - don't import this item
          return {
            ...item,
            action: "skip",
            selected: false,
            mergeWithId: null,
          };
        } else {
          // Merge - combine with existing (actual merge happens in 14-03)
          return {
            ...item,
            action: "merge",
            selected: true,
            mergeWithId: item.duplicateMatch?.existingId || null,
          };
        }
      })
    );
  };

  const highConfidenceCount = items.filter((item) => item.confidence >= 80).length;

  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: true, action: "create" as const })));
  };

  const selectNone = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: false, action: "skip" as const })));
  };

  const selectHighConfidence = () => {
    setItems((prev) =>
      prev.map((item) => {
        // Exclude high similarity duplicates (85%+) from auto-selection
        const isHighSimilarityDuplicate = item.duplicateMatch && item.duplicateMatch.score >= 85;
        const shouldSelect = !isHighSimilarityDuplicate && item.confidence >= 80;
        return {
          ...item,
          selected: shouldSelect,
          action: shouldSelect ? "create" as const : "skip" as const,
        };
      })
    );
  };

  const confirmImport = async () => {
    const toImport = items.map((item) => ({
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      frequency: item.frequency,
      categoryId: item.categoryId,
      nextRenewalDate: item.nextRenewalDate,
      action: item.selected ? item.action : "skip",
      mergeWithId: item.action === "merge" ? item.mergeWithId : null,
    }));

    setIsConfirming(true);

    try {
      const response = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptions: toImport,
          statementSource: accounts.find(a => a.id === statementSource)?.name ?? statementSource,
          rawExtractionData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import subscriptions");
      }

      const data = await response.json();
      setResult(data);
      setStep("complete");
      toast.success(`Successfully imported ${data.created} subscription(s)`);
    } catch (error) {
      toast.error(getErrorMessage(error), {
        duration: Infinity,
        action: {
          label: "Try again",
          onClick: () => confirmImport(),
        },
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <>
      <DashboardHeader
        title="Import"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Import" },
        ]}
      />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Import from Bank Statement
            </h2>
            <p className="text-muted-foreground">
              Upload your bank statement and we&apos;ll automatically detect your
              subscriptions using AI.
            </p>
          </div>

          {/* Step: Upload */}
          {step === "upload" && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Account field - required before upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Account <span className="text-destructive">*</span>
                  </label>
                  <AccountCombobox
                    value={statementSource}
                    onChange={setStatementSource}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    Select the account this statement belongs to
                  </p>
                </div>

                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50",
                    !statementSource && "opacity-50 pointer-events-none"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm font-medium">
                    {isDragActive
                      ? "Drop the files here..."
                      : "Drag & drop files here, or click to select"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supports PDF, PNG, JPEG, WebP (max 10MB each)
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={processFiles}
                  disabled={files.length === 0 || !statementSource || isProcessing}
                  className="w-full h-11"
                >
                  Process Files
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-lg font-medium">
                  {processingStatus ? statusMessages[processingStatus] : "Processing..."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This may take a moment
                </p>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="mt-6 h-11"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Review Detected Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length > 0 && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll} className="h-11">
                          Select all
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectNone} className="h-11">
                          Select none
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectHighConfidence} className="h-11">
                          Select high confidence ({highConfidenceCount})
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedCount} of {items.length} selected
                      </p>
                    </div>
                  )}
                  {items.length === 0 ? (
                    <div className="py-8 text-center">
                      <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 font-medium">
                        No subscriptions detected
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try uploading a clearer image or a different statement
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStep("upload");
                            setFiles([]);
                            setStatementSource("");
                          }}
                        >
                          Try Again
                        </Button>
                        <Button onClick={() => router.push("/subscriptions/new")}>
                          Add Manually
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {highConfidenceCount === 0 && items.length > 0 && (
                        <div className="mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                                No clear subscriptions found
                              </p>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                The AI had low confidence in these detections. Please review carefully before importing.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-4">
                        {items.map((item, index) => {
                          const hasDuplicate = item.duplicateMatch && item.duplicateMatch.score >= 70;
                          const isHighSimilarity = item.duplicateMatch && item.duplicateMatch.score >= 85;

                          return (
                        <div
                          key={index}
                          className={cn(
                            "rounded-lg border p-4 transition-colors",
                            item.selected ? "border-primary bg-primary/5" : "",
                            // Yellow background highlight for high similarity duplicates
                            isHighSimilarity && "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={() => toggleItem(index)}
                              disabled={item.action === "merge"}
                            />
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(item.amount, item.currency)} /{" "}
                                    {item.frequency}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ConfidenceBadge score={item.confidence} />
                                  {hasDuplicate && item.duplicateMatch && (
                                    <button
                                      type="button"
                                      onClick={() => toggleComparison(index)}
                                      className="cursor-pointer"
                                    >
                                      <DuplicateWarning
                                        score={item.duplicateMatch.score}
                                        existingName={item.duplicateMatch.existingName}
                                        matches={item.duplicateMatch.matches as {
                                          name: boolean;
                                          amount: boolean;
                                          frequency: boolean;
                                          category?: boolean;
                                          source?: boolean;
                                        }}
                                      />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Duplicate Comparison Panel (expandable) */}
                              {hasDuplicate && item.duplicateMatch && item.showComparison && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                                  <DuplicateComparison
                                    existing={{
                                      id: item.duplicateMatch.existingId,
                                      name: item.duplicateMatch.existingName,
                                      amount: item.duplicateMatch.existingAmount,
                                      currency: item.duplicateMatch.existingCurrency,
                                      frequency: item.duplicateMatch.existingFrequency,
                                    }}
                                    importing={{
                                      name: item.name,
                                      amount: item.amount,
                                      currency: item.currency,
                                      frequency: item.frequency,
                                    }}
                                    score={item.duplicateMatch.score}
                                    matches={item.duplicateMatch.matches as {
                                      name: boolean;
                                      amount: boolean;
                                      frequency: boolean;
                                      category?: boolean;
                                      source?: boolean;
                                    }}
                                  />

                                  {/* Action Buttons */}
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <Button
                                      variant={item.action === "create" ? "default" : "outline"}
                                      size="sm"
                                      className="h-11"
                                      onClick={() => setDuplicateAction(index, "create")}
                                    >
                                      Keep Both
                                    </Button>
                                    <Button
                                      variant={item.action === "skip" ? "default" : "outline"}
                                      size="sm"
                                      className="h-11"
                                      onClick={() => setDuplicateAction(index, "skip")}
                                    >
                                      Skip
                                    </Button>
                                    <Button
                                      variant={item.action === "merge" ? "default" : "outline"}
                                      size="sm"
                                      className="h-11"
                                      onClick={() => setDuplicateAction(index, "merge")}
                                      title="Merge functionality coming soon"
                                      disabled
                                    >
                                      Merge
                                    </Button>
                                  </div>

                                  {/* Current action indicator */}
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Current action:{" "}
                                    <span className="font-medium">
                                      {item.action === "create" && "Import as new subscription"}
                                      {item.action === "skip" && "Don't import"}
                                      {item.action === "merge" && `Merge with "${item.duplicateMatch.existingName}"`}
                                    </span>
                                  </p>
                                </div>
                              )}

                              {item.selected && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  {/* Name */}
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Name
                                    </label>
                                    <Input
                                      value={item.name}
                                      onChange={(e) => updateItem(index, { name: e.target.value })}
                                      className="mt-1 h-11"
                                    />
                                  </div>

                                  {/* Amount */}
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Amount
                                    </label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={item.amount}
                                      onChange={(e) =>
                                        updateItem(index, { amount: parseFloat(e.target.value) || 0 })
                                      }
                                      className="mt-1 h-11"
                                    />
                                  </div>

                                  {/* Cycle */}
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Cycle
                                    </label>
                                    <Select
                                      value={item.frequency}
                                      onValueChange={(v) =>
                                        updateItem(index, { frequency: v as "monthly" | "yearly" })
                                      }
                                    >
                                      <SelectTrigger className="mt-1 h-11">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Category */}
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Category
                                    </label>
                                    <Select
                                      value={item.categoryId ?? "none"}
                                      onValueChange={(v) =>
                                        updateItem(index, {
                                          categoryId: v === "none" ? null : v,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="mt-1 h-11">
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">
                                          No Category
                                        </SelectItem>
                                        {categoryOptions.map((cat) => (
                                          <SelectItem
                                            key={cat.value}
                                            value={cat.value}
                                          >
                                            {cat.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Transaction Date */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <DateConfidenceBadge dateFound={item.dateFound ?? !!item.transactionDateValue} />
                                    </div>
                                    <EditableDateField
                                      value={item.transactionDateValue}
                                      originalValue={item.originalTransactionDate}
                                      wasEdited={item.transactionDateEdited}
                                      dateNotFound={!item.dateFound && !item.transactionDateValue}
                                      onSave={(date) => updateTransactionDate(index, date)}
                                      onRevert={() => revertTransactionDate(index)}
                                      label="Transaction Date"
                                    />
                                  </div>

                                  {/* Renewal Date */}
                                  <div>
                                    <EditableDateField
                                      value={item.renewalDateValue}
                                      originalValue={item.originalRenewalDate}
                                      wasEdited={item.renewalDateEdited}
                                      onSave={(date) => updateRenewalDate(index, date)}
                                      onRevert={item.renewalDateEdited ? () => revertRenewalDate(index) : undefined}
                                      label="Next Renewal"
                                    />
                                    {item.renewalDateValue && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(item.renewalDateValue, { addSuffix: true })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {items.length > 0 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedCount} of {items.length} subscriptions selected
                  </p>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("upload");
                        setFiles([]);
                        setItems([]);
                        setStatementSource("");
                      }}
                      className="w-full sm:w-auto h-11"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmImport}
                      disabled={selectedCount === 0 || isConfirming}
                      className="w-full sm:w-auto h-11"
                    >
                      {isConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import {selectedCount} Subscription
                          {selectedCount !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step: Complete */}
          {step === "complete" && result && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Import Complete!</h3>
                <p className="mt-1 text-muted-foreground">
                  {result.created} subscription{result.created !== 1 ? "s" : ""}{" "}
                  imported successfully
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {result.skipped} skipped
                  </p>
                )}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center sm:gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("upload");
                      setFiles([]);
                      setItems([]);
                      setResult(null);
                      setStatementSource("");
                    }}
                    className="w-full sm:w-auto h-11"
                  >
                    Import More
                  </Button>
                  <Button onClick={() => router.push("/subscriptions")} className="w-full sm:w-auto h-11">
                    View Subscriptions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import History */}
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : importHistoryData?.imports && importHistoryData.imports.length > 0 ? (
                <div className="space-y-2">
                  {importHistoryData.imports.map((importItem) => (
                    <div
                      key={importItem.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{importItem.statementSource}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(importItem.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {importItem.subscriptionsCreated} imported
                        </p>
                        {importItem.subscriptionsSkipped > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {importItem.subscriptionsSkipped} skipped
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No imports yet"
                  description="Upload a PDF bank statement to automatically detect your subscriptions."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
