import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";
import { desc, like, eq, and, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function WebhookLogsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Build filters
  const filters = [];
  if (params.status) {
    filters.push(eq(webhookEvents.status, params.status));
  }
  if (params.type) {
    filters.push(like(webhookEvents.eventType, `%${params.type}%`));
  }

  // Query events with pagination
  const events = await db
    .select()
    .from(webhookEvents)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(webhookEvents.processedAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(webhookEvents)
    .where(filters.length > 0 ? and(...filters) : undefined);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);

  // Calculate showing range
  const showingStart = total === 0 ? 0 : offset + 1;
  const showingEnd = Math.min(offset + pageSize, total);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Webhook Event Logs
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and filter webhook processing history
        </p>
      </div>

      {/* Filter Controls */}
      <form method="GET" className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="status"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
          >
            Status:
          </label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">All</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="processing">Processing</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label
            htmlFor="type"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
          >
            Event Type:
          </label>
          <Input
            id="type"
            name="type"
            type="text"
            placeholder="Filter by event type..."
            defaultValue={params.type ?? ""}
            className="flex-1"
          />
        </div>

        <Button type="submit" size="sm">
          Filter
        </Button>

        {(params.status || params.type) && (
          <Link href="/admin/webhooks">
            <Button type="button" variant="outline" size="sm">
              Clear Filters
            </Button>
          </Link>
        )}
      </form>

      {/* Stats Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          Total events: <span className="font-medium">{total}</span>
        </div>
        {total > 0 && (
          <div>
            Showing {showingStart}-{showingEnd} of {total}
          </div>
        )}
      </div>

      {/* Events Table */}
      {events.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {params.status || params.type
              ? "No events match your filters"
              : "No webhook events found"}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {event.eventId.substring(0, 20)}...
                    </code>
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.eventType}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        event.status === "processed"
                          ? "default"
                          : event.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                      className={
                        event.status === "processed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900"
                          : event.status === "failed"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900"
                            : event.status === "processing"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }
                    >
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {new Date(event.processedAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {event.processingTimeMs ? (
                      <span className="font-mono text-xs">
                        {event.processingTimeMs}ms
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {event.errorMessage ? (
                      <div className="max-w-md">
                        <p className="text-xs text-red-600 dark:text-red-400 truncate">
                          {event.errorMessage.substring(0, 100)}
                          {event.errorMessage.length > 100 && "..."}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/webhooks?page=${page - 1}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/webhooks?page=${page + 1}${params.status ? `&status=${params.status}` : ""}${params.type ? `&type=${params.type}` : ""}`}
              >
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
