"use client";

import Link from "next/link";
import { Archive, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VaultEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <Archive className="size-16 text-muted-foreground/30" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Your Statement Vault</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Upload bank statements to build your financial archive. All your PDFs
          will be stored securely and organized by source.
        </p>
      </div>
      <Button asChild>
        <Link href="/import/batch">
          <Upload className="size-4 mr-2" />
          Upload Statements
        </Link>
      </Button>
    </div>
  );
}
