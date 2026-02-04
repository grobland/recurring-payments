import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold md:text-xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground md:text-base">
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex w-full flex-col-reverse gap-3 px-4 sm:w-auto sm:flex-row sm:px-0">
          {primaryAction && (
            <Button asChild className="h-11 w-full sm:w-auto">
              <Link href={primaryAction.href}>
                {primaryAction.icon && (
                  <primaryAction.icon className="mr-2 h-4 w-4" />
                )}
                {primaryAction.label}
              </Link>
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" asChild className="h-11 w-full sm:w-auto">
              <Link href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
