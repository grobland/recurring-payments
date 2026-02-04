import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ServiceUnavailableProps {
  serviceName?: string;
  onRetry?: () => void;
  className?: string;
}

export function ServiceUnavailable({
  serviceName = "This service",
  onRetry,
  className,
}: ServiceUnavailableProps) {
  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <CardTitle>Service Temporarily Unavailable</CardTitle>
        <CardDescription>
          {serviceName} is currently unavailable. Please try again in a moment.
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="text-center">
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            If this problem persists,{" "}
            <a
              href="mailto:support@example.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              contact support
            </a>
            .
          </p>
        </CardContent>
      )}
    </Card>
  );
}
