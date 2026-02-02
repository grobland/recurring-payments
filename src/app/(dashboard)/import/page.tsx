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
import { useCategoryOptions, useImportSources } from "@/lib/hooks";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DetectedSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  confidence: number;
  isDuplicate?: boolean;
  duplicateOf?: string;
  transactionDate?: string | null;  // ISO string from AI
  dateFound?: boolean;
}

interface ImportItem extends DetectedSubscription {
  selected: boolean;
  categoryId: string | null;
  nextRenewalDate: Date;
  action: "create" | "skip" | "merge";
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

  const { options: categoryOptions } = useCategoryOptions();
  const { data: importSources = [] } = useImportSources();

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

  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setStep("processing");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process files");
      }

      const data = await response.json();

      // Store raw extraction data for confirm step
      setRawExtractionData(data.rawExtractionData);

      // Transform detected subscriptions to import items
      const importItems: ImportItem[] = data.subscriptions.map(
        (sub: DetectedSubscription) => {
          const parsedTransactionDate = parseDateFromAI(sub.transactionDate);
          const calculatedRenewal = parsedTransactionDate
            ? calculateRenewalFromTransaction(parsedTransactionDate, sub.frequency)
            : addMonths(new Date(), 1);

          return {
            ...sub,
            selected: !sub.isDuplicate && sub.confidence >= 80,
            categoryId: null,
            nextRenewalDate: calculatedRenewal,
            action: sub.isDuplicate ? "skip" : "create",
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
      setStep("review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process files");
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

  const highConfidenceCount = items.filter((item) => item.confidence >= 80).length;

  const selectAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: true, action: "create" as const })));
  };

  const selectNone = () => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: false, action: "skip" as const })));
  };

  const selectHighConfidence = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: !item.isDuplicate && item.confidence >= 80,
        action: (!item.isDuplicate && item.confidence >= 80) ? "create" as const : "skip" as const,
      }))
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
    }));

    setIsConfirming(true);

    try {
      const response = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptions: toImport,
          statementSource,
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
      toast.error(error instanceof Error ? error.message : "Failed to import");
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
      <main className="flex-1 p-6">
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
                    previousAccounts={importSources}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., &quot;Chase Visa&quot; or &quot;Wells Fargo Checking&quot;
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
                  className="w-full"
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
                  Analyzing your documents...
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This may take a moment
                </p>
                <Progress value={33} className="mt-6 mx-auto max-w-xs" />
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                          Select all
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectNone}>
                          Select none
                        </Button>
                        <Button variant="outline" size="sm" onClick={selectHighConfidence}>
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
                        {items.map((item, index) => (
                        <div
                          key={index}
                          className={cn(
                            "rounded-lg border p-4 transition-colors",
                            item.selected ? "border-primary bg-primary/5" : ""
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={() => toggleItem(index)}
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
                                  {item.isDuplicate && (
                                    <Badge variant="destructive">
                                      Duplicate of {item.duplicateOf}
                                    </Badge>
                                  )}
                                </div>
                              </div>

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
                                      className="mt-1"
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
                                      className="mt-1"
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
                                      <SelectTrigger className="mt-1">
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
                                      <SelectTrigger className="mt-1">
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

                                  {/* Next Renewal */}
                                  <div>
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Next Renewal
                                    </label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="mt-1 w-full justify-start text-left font-normal"
                                        >
                                          {format(item.nextRenewalDate, "PPP")}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                      >
                                        <Calendar
                                          mode="single"
                                          selected={item.nextRenewalDate}
                                          onSelect={(date) =>
                                            date &&
                                            updateItem(index, {
                                              nextRenewalDate: date,
                                            })
                                          }
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {items.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedCount} of {items.length} subscriptions selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("upload");
                        setFiles([]);
                        setItems([]);
                        setStatementSource("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmImport}
                      disabled={selectedCount === 0 || isConfirming}
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
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep("upload");
                      setFiles([]);
                      setItems([]);
                      setResult(null);
                      setStatementSource("");
                    }}
                  >
                    Import More
                  </Button>
                  <Button onClick={() => router.push("/subscriptions")}>
                    View Subscriptions
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
