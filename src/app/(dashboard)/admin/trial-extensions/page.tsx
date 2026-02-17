import { db } from "@/lib/db";
import { trialExtensions, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExtendTrialForm } from "./extend-trial-form";

interface PageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export default async function TrialExtensionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Query extensions with user info
  const extensions = await db
    .select({
      id: trialExtensions.id,
      daysAdded: trialExtensions.daysAdded,
      reason: trialExtensions.reason,
      createdAt: trialExtensions.createdAt,
      previousTrialEndDate: trialExtensions.previousTrialEndDate,
      newTrialEndDate: trialExtensions.newTrialEndDate,
      userEmail: users.email,
      userName: users.name,
    })
    .from(trialExtensions)
    .innerJoin(users, eq(trialExtensions.userId, users.id))
    .orderBy(desc(trialExtensions.createdAt))
    .limit(pageSize)
    .offset(offset);

  // Get total count for pagination
  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(trialExtensions);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.ceil(total / pageSize);
  const showingStart = total === 0 ? 0 : offset + 1;
  const showingEnd = Math.min(offset + pageSize, total);

  // Get trial users for the form
  const trialUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      trialEndDate: users.trialEndDate,
    })
    .from(users)
    .where(eq(users.billingStatus, "trial"))
    .orderBy(users.email);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Trial Extensions
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Extend trial periods for engaged users
        </p>
      </div>

      {/* Extend Trial Form */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Apply Trial Extension
        </h3>
        <ExtendTrialForm users={trialUsers} />
      </div>

      {/* Stats Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div>
          Total extensions: <span className="font-medium">{total}</span>
        </div>
        {total > 0 && (
          <div>
            Showing {showingStart}-{showingEnd} of {total}
          </div>
        )}
      </div>

      {/* Extensions Table */}
      {extensions.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No trial extensions have been applied yet
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Days Added</TableHead>
                <TableHead>Previous End</TableHead>
                <TableHead>New End</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extensions.map((ext) => (
                <TableRow key={ext.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {ext.userName || "No name"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {ext.userEmail}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      +{ext.daysAdded} days
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {ext.previousTrialEndDate
                      ? format(new Date(ext.previousTrialEndDate), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {format(new Date(ext.newTrialEndDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {ext.reason ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                        {ext.reason}
                      </p>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {format(new Date(ext.createdAt), "MMM d, yyyy HH:mm")}
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
              <a href={`/admin/trial-extensions?page=${page - 1}`}>
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </a>
            )}
            {page < totalPages && (
              <a href={`/admin/trial-extensions?page=${page + 1}`}>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Session note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
        Note: Users may need to sign out and back in to see updated trial end dates.
      </p>
    </div>
  );
}
