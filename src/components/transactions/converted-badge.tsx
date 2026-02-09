"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConvertedBadgeProps {
  subscriptionId: string;
}

/**
 * Badge component showing a transaction has been converted to a subscription.
 * Links to the subscriptions page when clicked.
 */
export function ConvertedBadge({ subscriptionId }: ConvertedBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={`/subscriptions?highlight=${subscriptionId}`}>
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 cursor-pointer flex items-center gap-1"
          >
            <Link2 className="h-3 w-3" />
            <span>Converted</span>
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <p>View subscription</p>
      </TooltipContent>
    </Tooltip>
  );
}
