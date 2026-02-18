"use client";

import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIER_CONFIG } from "@/lib/stripe/products";
import type { Tier } from "@/lib/db/schema";

/**
 * Feature row definition for the comparison matrix
 */
interface FeatureRow {
  name: string;
  primary: boolean;
  enhanced: boolean;
  advanced: boolean;
}

/**
 * Static feature matrix defining availability per tier
 * Order: Primary tier features first, then Enhanced, then Advanced
 */
const FEATURE_MATRIX: FeatureRow[] = [
  // Primary tier features
  { name: "Unlimited subscription tracking", primary: true, enhanced: true, advanced: true },
  { name: "PDF statement imports", primary: true, enhanced: true, advanced: true },
  { name: "Spending analytics dashboard", primary: true, enhanced: true, advanced: true },
  { name: "Email renewal reminders", primary: true, enhanced: true, advanced: true },
  { name: "Category organization", primary: true, enhanced: true, advanced: true },
  // Enhanced tier features
  { name: "Spending monitoring", primary: false, enhanced: true, advanced: true },
  { name: "Budget management", primary: false, enhanced: true, advanced: true },
  { name: "Debt tracking", primary: false, enhanced: true, advanced: true },
  { name: "Transaction categorization", primary: false, enhanced: true, advanced: true },
  // Advanced tier features
  { name: "Investment tracking", primary: false, enhanced: false, advanced: true },
  { name: "Net worth dashboard", primary: false, enhanced: false, advanced: true },
  { name: "Multi-account aggregation", primary: false, enhanced: false, advanced: true },
  { name: "Financial goal planning", primary: false, enhanced: false, advanced: true },
];

const TIERS: Tier[] = ["primary", "enhanced", "advanced"];

/**
 * Feature comparison table component
 * Displays feature availability across tiers with responsive design:
 * - Desktop (md+): Horizontal table with all tiers as columns
 * - Mobile (<md): Stacked cards, one per tier with its features
 */
export function FeatureComparisonTable() {
  return (
    <div className="rounded-lg border">
      {/* Desktop view - traditional table */}
      <Table className="hidden md:table">
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-[280px] font-semibold">Features</TableHead>
            {TIERS.map((tier) => (
              <TableHead key={tier} className="text-center font-semibold">
                {TIER_CONFIG[tier].name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {FEATURE_MATRIX.map((feature, idx) => (
            <TableRow key={idx} className="hover:bg-muted/50">
              <TableCell className="font-medium">{feature.name}</TableCell>
              {TIERS.map((tier) => {
                const hasAccess = feature[tier];
                return (
                  <TableCell key={tier} className="text-center">
                    {hasAccess ? (
                      <Check className="mx-auto h-5 w-5 text-primary" />
                    ) : (
                      <X className="mx-auto h-5 w-5 text-muted-foreground" />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Mobile view - stacked cards */}
      <div className="md:hidden space-y-6 p-4">
        {TIERS.map((tier) => (
          <div key={tier} className="rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-bold">{TIER_CONFIG[tier].name}</h3>
            <ul className="space-y-2">
              {FEATURE_MATRIX.filter((f) => f[tier]).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{feature.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
