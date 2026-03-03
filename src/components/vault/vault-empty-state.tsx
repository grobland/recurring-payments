"use client";

import Link from "next/link";
import { Archive, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHintDismissals } from "@/lib/hooks/use-hint-dismissals";

export function VaultEmptyState() {
  const { isDismissed, dismiss } = useHintDismissals();

  if (isDismissed("vault")) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No statements yet
      </p>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-16 text-center space-y-4">
      <button
        onClick={() => dismiss("vault")}
        className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss hint"
      >
        <X className="h-4 w-4" />
      </button>
      <Archive className="size-16 text-muted-foreground/30" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Your Statement Vault</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload bank statements to build your financial archive. All your PDFs
          will be stored securely and organized by source.
        </p>
      </div>
      <Button asChild>
        <Link href="/vault/load">
          <Upload className="size-4 mr-2" />
          Upload Statements
        </Link>
      </Button>
    </div>
  );
}
