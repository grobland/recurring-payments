import { Metadata } from "next";
import { DashboardHeader } from "@/components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Data Schema",
  description: "System data model reference",
};

const SCHEMA_TABLES = [
  {
    name: "users",
    description: "User accounts with preferences and billing status",
    columns: [
      { name: "id", type: "uuid" },
      { name: "email", type: "varchar(255)" },
      { name: "emailVerified", type: "timestamp" },
      { name: "passwordHash", type: "text" },
      { name: "name", type: "varchar(255)" },
      { name: "image", type: "text" },
      { name: "displayCurrency", type: "varchar(3)" },
      { name: "locale", type: "varchar(10)" },
      { name: "reminderDaysBefore", type: "jsonb" },
      { name: "emailRemindersEnabled", type: "boolean" },
      { name: "trialStartDate", type: "timestamp" },
      { name: "trialEndDate", type: "timestamp" },
      { name: "billingStatus", type: "billing_status enum" },
      { name: "stripeCustomerId", type: "varchar(255)" },
      { name: "stripeSubscriptionId", type: "varchar(255)" },
      { name: "stripePriceId", type: "varchar(255)" },
      { name: "currentPeriodEnd", type: "timestamp" },
      { name: "onboardingCompleted", type: "boolean" },
      { name: "role", type: "user_role enum" },
      { name: "consentGiven", type: "boolean" },
      { name: "consentDate", type: "timestamp" },
      { name: "createdAt", type: "timestamp" },
      { name: "updatedAt", type: "timestamp" },
    ],
  },
  {
    name: "accounts",
    description: "NextAuth OAuth provider accounts",
    columns: [
      { name: "userId", type: "uuid -> users" },
      { name: "type", type: "varchar(255)" },
      { name: "provider", type: "varchar(255)" },
      { name: "providerAccountId", type: "varchar(255)" },
      { name: "refresh_token", type: "text" },
      { name: "access_token", type: "text" },
      { name: "expires_at", type: "integer" },
      { name: "token_type", type: "varchar(255)" },
      { name: "scope", type: "varchar(255)" },
      { name: "id_token", type: "text" },
      { name: "session_state", type: "varchar(255)" },
    ],
  },
  {
    name: "sessions",
    description: "NextAuth active sessions",
    columns: [
      { name: "sessionToken", type: "varchar(255)" },
      { name: "userId", type: "uuid -> users" },
      { name: "expires", type: "timestamp" },
    ],
  },
  {
    name: "verification_tokens",
    description: "NextAuth email verification tokens",
    columns: [
      { name: "identifier", type: "varchar(255)" },
      { name: "token", type: "varchar(255)" },
      { name: "expires", type: "timestamp" },
    ],
  },
  {
    name: "authenticators",
    description: "NextAuth WebAuthn credentials",
    columns: [
      { name: "credentialID", type: "text" },
      { name: "userId", type: "uuid -> users" },
      { name: "providerAccountId", type: "text" },
      { name: "credentialPublicKey", type: "text" },
      { name: "counter", type: "integer" },
      { name: "credentialDeviceType", type: "text" },
      { name: "credentialBackedUp", type: "boolean" },
      { name: "transports", type: "text" },
    ],
  },
  {
    name: "password_reset_tokens",
    description: "Password reset flow tokens",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "token", type: "varchar(255)" },
      { name: "expires", type: "timestamp" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "categories",
    description: "Subscription categories (predefined and custom)",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "name", type: "varchar(100)" },
      { name: "slug", type: "varchar(100)" },
      { name: "icon", type: "varchar(50)" },
      { name: "color", type: "varchar(7)" },
      { name: "isDefault", type: "boolean" },
      { name: "sortOrder", type: "integer" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "subscriptions",
    description: "User subscription records with renewal tracking",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "categoryId", type: "uuid -> categories" },
      { name: "name", type: "varchar(255)" },
      { name: "description", type: "text" },
      { name: "notes", type: "text" },
      { name: "url", type: "text" },
      { name: "amount", type: "decimal(10,2)" },
      { name: "currency", type: "varchar(3)" },
      { name: "frequency", type: "frequency enum" },
      { name: "normalizedMonthlyAmount", type: "decimal(10,2)" },
      { name: "nextRenewalDate", type: "timestamp" },
      { name: "lastRenewalDate", type: "timestamp" },
      { name: "startDate", type: "timestamp" },
      { name: "status", type: "subscription_status enum" },
      { name: "needsUpdate", type: "boolean" },
      { name: "reminderEnabled", type: "boolean" },
      { name: "reminderDaysBefore", type: "jsonb" },
      { name: "skipNextReminder", type: "boolean" },
      { name: "reminderSnoozedUntil", type: "timestamp" },
      { name: "deletedAt", type: "timestamp" },
      { name: "mergedAt", type: "timestamp" },
      { name: "mergedIntoId", type: "uuid -> subscriptions" },
      { name: "importAuditId", type: "uuid -> import_audits" },
      { name: "createdAt", type: "timestamp" },
      { name: "updatedAt", type: "timestamp" },
    ],
  },
  {
    name: "reminder_logs",
    description: "Email reminder delivery tracking",
    columns: [
      { name: "id", type: "uuid" },
      { name: "subscriptionId", type: "uuid -> subscriptions" },
      { name: "userId", type: "uuid -> users" },
      { name: "status", type: "reminder_status enum" },
      { name: "scheduledFor", type: "timestamp" },
      { name: "sentAt", type: "timestamp" },
      { name: "failedAt", type: "timestamp" },
      { name: "errorMessage", type: "text" },
      { name: "emailTo", type: "varchar(255)" },
      { name: "emailSubject", type: "varchar(500)" },
      { name: "resendMessageId", type: "varchar(255)" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "import_audits",
    description: "PDF import history and extraction data",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "statementSource", type: "varchar(50)" },
      { name: "fileCount", type: "integer" },
      { name: "totalPageCount", type: "integer" },
      { name: "detectedCount", type: "integer" },
      { name: "confirmedCount", type: "integer" },
      { name: "rejectedCount", type: "integer" },
      { name: "mergedCount", type: "integer" },
      { name: "rawExtractionData", type: "jsonb" },
      { name: "completedAt", type: "timestamp" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "fx_rates_cache",
    description: "Exchange rate caching",
    columns: [
      { name: "id", type: "uuid" },
      { name: "baseCurrency", type: "varchar(3)" },
      { name: "rates", type: "jsonb" },
      { name: "fetchedAt", type: "timestamp" },
      { name: "expiresAt", type: "timestamp" },
    ],
  },
  {
    name: "recurring_patterns",
    description: "AI-detected recurring charge patterns",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "merchantName", type: "varchar(255)" },
      { name: "currency", type: "varchar(3)" },
      { name: "occurrenceCount", type: "integer" },
      { name: "avgAmount", type: "decimal(10,2)" },
      { name: "amountStddev", type: "decimal(10,2)" },
      { name: "avgIntervalDays", type: "integer" },
      { name: "intervalStddev", type: "integer" },
      { name: "detectedFrequency", type: "frequency enum" },
      { name: "chargeDates", type: "jsonb" },
      { name: "amounts", type: "jsonb" },
      { name: "confidenceScore", type: "integer" },
      { name: "dismissedAt", type: "timestamp" },
      { name: "acceptedAt", type: "timestamp" },
      { name: "createdSubscriptionId", type: "uuid -> subscriptions" },
      { name: "detectedAt", type: "timestamp" },
      { name: "updatedAt", type: "timestamp" },
    ],
  },
  {
    name: "alerts",
    description: "Price increase and missed renewal alerts",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "subscriptionId", type: "uuid -> subscriptions" },
      { name: "type", type: "alert_type enum" },
      { name: "metadata", type: "jsonb" },
      { name: "acknowledgedAt", type: "timestamp" },
      { name: "dismissedAt", type: "timestamp" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "financial_accounts",
    description: "User financial accounts (bank, credit card, loan)",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "name", type: "varchar(100)" },
      { name: "accountType", type: "account_type enum" },
      { name: "institution", type: "varchar(100)" },
      { name: "currency", type: "varchar(3)" },
      { name: "isActive", type: "boolean" },
      { name: "notes", type: "text" },
      { name: "linkedSourceType", type: "varchar(100)" },
      { name: "creditLimit", type: "decimal(12,2)" },
      { name: "statementClosingDay", type: "integer" },
      { name: "originalBalance", type: "decimal(12,2)" },
      { name: "interestRate", type: "decimal(5,4)" },
      { name: "loanTermMonths", type: "integer" },
      { name: "createdAt", type: "timestamp" },
      { name: "updatedAt", type: "timestamp" },
    ],
  },
  {
    name: "statements",
    description: "Uploaded PDF statement metadata",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "sourceType", type: "varchar(100)" },
      { name: "pdfHash", type: "varchar(64)" },
      { name: "pdfStoragePath", type: "text" },
      { name: "originalFilename", type: "varchar(255)" },
      { name: "fileSizeBytes", type: "integer" },
      { name: "statementDate", type: "timestamp" },
      { name: "processingStatus", type: "processing_status enum" },
      { name: "processingError", type: "text" },
      { name: "transactionCount", type: "integer" },
      { name: "accountId", type: "uuid -> financial_accounts" },
      { name: "createdAt", type: "timestamp" },
      { name: "processedAt", type: "timestamp" },
    ],
  },
  {
    name: "transactions",
    description: "Extracted transactions from statements",
    columns: [
      { name: "id", type: "uuid" },
      { name: "statementId", type: "uuid -> statements" },
      { name: "userId", type: "uuid -> users" },
      { name: "transactionDate", type: "timestamp" },
      { name: "merchantName", type: "varchar(255)" },
      { name: "amount", type: "decimal(10,2)" },
      { name: "currency", type: "varchar(3)" },
      { name: "description", type: "text" },
      { name: "fingerprint", type: "varchar(64)" },
      { name: "tagStatus", type: "transaction_tag_status enum" },
      { name: "confidenceScore", type: "integer" },
      { name: "categoryGuess", type: "varchar(100)" },
      { name: "rawText", type: "text" },
      { name: "aiMetadata", type: "jsonb" },
      { name: "convertedToSubscriptionId", type: "uuid -> subscriptions" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "tags",
    description: "User-defined transaction tags",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "name", type: "varchar(50)" },
      { name: "color", type: "varchar(7)" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "transaction_tags",
    description: "Junction table linking transactions to tags",
    columns: [
      { name: "transactionId", type: "uuid -> transactions" },
      { name: "tagId", type: "uuid -> tags" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "webhook_events",
    description: "Stripe webhook idempotency log",
    columns: [
      { name: "id", type: "uuid" },
      { name: "eventId", type: "varchar(255)" },
      { name: "eventType", type: "varchar(100)" },
      { name: "processedAt", type: "timestamp" },
      { name: "status", type: "varchar(20)" },
      { name: "errorMessage", type: "text" },
      { name: "processingTimeMs", type: "integer" },
      { name: "expiresAt", type: "timestamp" },
    ],
  },
  {
    name: "stripe_prices",
    description: "Stripe price catalog",
    columns: [
      { name: "id", type: "uuid" },
      { name: "stripePriceId", type: "varchar(255)" },
      { name: "tier", type: "tier enum" },
      { name: "interval", type: "varchar(20)" },
      { name: "currency", type: "varchar(3)" },
      { name: "amountCents", type: "integer" },
      { name: "isActive", type: "boolean" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
  {
    name: "trial_extensions",
    description: "Admin-granted trial extensions",
    columns: [
      { name: "id", type: "uuid" },
      { name: "userId", type: "uuid -> users" },
      { name: "daysAdded", type: "integer" },
      { name: "previousTrialEndDate", type: "timestamp" },
      { name: "newTrialEndDate", type: "timestamp" },
      { name: "appliedByAdminId", type: "uuid -> users" },
      { name: "reason", type: "text" },
      { name: "createdAt", type: "timestamp" },
    ],
  },
];

export default function DataSchemaPage() {
  return (
    <>
      <DashboardHeader title="Data Schema" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Data Schema</h2>
            <p className="text-muted-foreground">
              A read-only reference for the system&apos;s data model
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {SCHEMA_TABLES.map((table) => (
              <Card key={table.name}>
                <CardHeader>
                  <CardTitle className="font-mono text-base">
                    {table.name}
                  </CardTitle>
                  <CardDescription>{table.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-sm">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex gap-3">
                        <span className="text-muted-foreground font-mono w-48 shrink-0 truncate">
                          {col.name}
                        </span>
                        <span className="font-mono text-muted-foreground/70">
                          {col.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
