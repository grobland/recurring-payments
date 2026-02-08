import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  decimal,
  integer,
  pgEnum,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ============ ENUMS ============

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
]);

export const frequencyEnum = pgEnum("frequency", ["monthly", "yearly"]);

export const billingStatusEnum = pgEnum("billing_status", [
  "trial",
  "active",
  "cancelled",
  "past_due",
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "sent",
  "failed",
  "pending",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "price_increase",
  "missed_renewal",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

export const transactionTagStatusEnum = pgEnum("transaction_tag_status", [
  "unreviewed",
  "potential_subscription",
  "not_subscription",
  "converted",
]);

// ============ USERS TABLE ============

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  passwordHash: text("password_hash"), // null for OAuth users
  name: varchar("name", { length: 255 }),
  image: text("image"),

  // Preferences
  displayCurrency: varchar("display_currency", { length: 3 })
    .default("USD")
    .notNull(),
  locale: varchar("locale", { length: 10 }).default("en-US").notNull(),

  // Reminder preferences (global defaults)
  reminderDaysBefore: jsonb("reminder_days_before")
    .$type<number[]>()
    .default([7, 1])
    .notNull(),
  emailRemindersEnabled: boolean("email_reminders_enabled")
    .default(true)
    .notNull(),

  // Trial & Billing
  trialStartDate: timestamp("trial_start_date", { withTimezone: true }),
  trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
  billingStatus: billingStatusEnum("billing_status").default("trial").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),

  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),

  // GDPR
  consentGiven: boolean("consent_given").default(false).notNull(),
  consentDate: timestamp("consent_date", { withTimezone: true }),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============ ACCOUNTS TABLE (NextAuth) ============

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccountType>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
    index("accounts_user_id_idx").on(table.userId),
  ]
);

// ============ SESSIONS TABLE (NextAuth) ============

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

// ============ VERIFICATION TOKENS TABLE (NextAuth) ============

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

// ============ AUTHENTICATORS TABLE (NextAuth - WebAuthn) ============

export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.credentialID] }),
  ]
);

// ============ PASSWORD RESET TOKENS ============

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ============ CATEGORIES TABLE ============

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = predefined
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    icon: varchar("icon", { length: 50 }).notNull(), // Icon name from lucide
    color: varchar("color", { length: 7 }).notNull(), // Hex color
    isDefault: boolean("is_default").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("categories_user_slug_idx").on(table.userId, table.slug),
  ]
);

// ============ SUBSCRIPTIONS TABLE ============

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    // Basic info
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    notes: text("notes"),
    url: text("url"), // Service website URL

    // Cost
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    frequency: frequencyEnum("frequency").notNull(),
    normalizedMonthlyAmount: decimal("normalized_monthly_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Dates
    nextRenewalDate: timestamp("next_renewal_date", {
      withTimezone: true,
    }).notNull(),
    lastRenewalDate: timestamp("last_renewal_date", { withTimezone: true }),
    startDate: timestamp("start_date", { withTimezone: true }),

    // Status
    status: subscriptionStatusEnum("status").default("active").notNull(),
    needsUpdate: boolean("needs_update").default(false).notNull(), // Set when renewal date passes

    // Reminder overrides (null = use global defaults)
    reminderEnabled: boolean("reminder_enabled").default(true).notNull(),
    reminderDaysBefore: jsonb("reminder_days_before").$type<number[] | null>(),
    skipNextReminder: boolean("skip_next_reminder").default(false).notNull(),
    reminderSnoozedUntil: timestamp("reminder_snoozed_until", {
      withTimezone: true,
    }),

    // Soft delete
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Merge tracking (for soft delete with undo)
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    mergedIntoId: uuid("merged_into_id"), // Self-reference handled in relations

    // Import tracking
    importAuditId: uuid("import_audit_id").references(() => importAudits.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_user_status_idx").on(table.userId, table.status),
    index("subscriptions_next_renewal_idx").on(table.nextRenewalDate),
    index("subscriptions_deleted_at_idx").on(table.deletedAt),
  ]
);

// ============ REMINDER LOGS TABLE ============

export const reminderLogs = pgTable(
  "reminder_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: reminderStatusEnum("status").notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    errorMessage: text("error_message"),

    // Email details
    emailTo: varchar("email_to", { length: 255 }).notNull(),
    emailSubject: varchar("email_subject", { length: 500 }),
    resendMessageId: varchar("resend_message_id", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("reminder_logs_subscription_id_idx").on(table.subscriptionId),
    index("reminder_logs_user_id_idx").on(table.userId),
    index("reminder_logs_scheduled_for_idx").on(table.scheduledFor),
  ]
);

// ============ IMPORT AUDITS TABLE ============

export const importAudits = pgTable(
  "import_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Statement source (bank/credit card account name)
    statementSource: varchar("statement_source", { length: 50 }),

    // File info (metadata only, no actual file stored)
    fileCount: integer("file_count").notNull(),
    totalPageCount: integer("total_page_count"),

    // Processing results
    detectedCount: integer("detected_count").notNull(),
    confirmedCount: integer("confirmed_count").default(0).notNull(),
    rejectedCount: integer("rejected_count").default(0).notNull(),
    mergedCount: integer("merged_count").default(0).notNull(),

    // Raw AI extraction data (for audit/debugging)
    rawExtractionData: jsonb("raw_extraction_data").$type<{
      subscriptions: Array<{
        name: string;
        amount: number;
        currency: string;
        frequency: "monthly" | "yearly";
        confidence: number;
        rawText?: string;
      }>;
      model: string;
      processingTime: number;
      pageCount: number;
      extractedAt: string;
    }>(),

    // Status
    completedAt: timestamp("completed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("import_audits_user_id_idx").on(table.userId)]
);

// ============ FX RATES CACHE TABLE ============

export const fxRatesCache = pgTable(
  "fx_rates_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baseCurrency: varchar("base_currency", { length: 3 }).notNull(),
    rates: jsonb("rates").$type<Record<string, number>>().notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("fx_rates_cache_base_currency_idx").on(table.baseCurrency),
  ]
);

// ============ RECURRING PATTERNS TABLE ============

export const recurringPatterns = pgTable(
  "recurring_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Pattern identification
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),

    // Detection data
    occurrenceCount: integer("occurrence_count").notNull(),
    avgAmount: decimal("avg_amount", { precision: 10, scale: 2 }).notNull(),
    amountStddev: decimal("amount_stddev", { precision: 10, scale: 2 }),
    avgIntervalDays: integer("avg_interval_days"),
    intervalStddev: integer("interval_stddev"),
    detectedFrequency: frequencyEnum("detected_frequency"), // monthly | yearly | null

    // Evidence data (stored as JSON arrays)
    chargeDates: jsonb("charge_dates").$type<string[]>().notNull(),
    amounts: jsonb("amounts").$type<number[]>().notNull(),

    // Confidence scoring
    confidenceScore: integer("confidence_score").notNull(), // 0-100

    // User actions
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdSubscriptionId: uuid("created_subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),

    // Timestamps
    detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("recurring_patterns_user_id_idx").on(table.userId),
    index("recurring_patterns_merchant_currency_idx").on(table.merchantName, table.currency),
    index("recurring_patterns_confidence_idx").on(table.confidenceScore),
  ]
);

// ============ ALERTS TABLE ============

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "cascade",
    }),

    type: alertTypeEnum("type").notNull(),

    // Store alert-specific data (old/new prices, expected date, etc.)
    metadata: jsonb("metadata").$type<{
      oldAmount?: number;
      newAmount?: number;
      currency?: string;
      expectedDate?: string;
      subscriptionName?: string; // Snapshot in case subscription deleted
    }>(),

    // Lifecycle
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }), // Soft delete

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("alerts_user_id_idx").on(table.userId),
    index("alerts_subscription_id_idx").on(table.subscriptionId),
    index("alerts_created_at_idx").on(table.createdAt),
  ]
);

// ============ STATEMENTS TABLE ============

export const statements = pgTable(
  "statements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Source identification
    sourceType: varchar("source_type", { length: 100 }).notNull(), // "Chase Sapphire", "Bank of America"

    // PDF storage
    pdfHash: varchar("pdf_hash", { length: 64 }).notNull(), // SHA-256 for duplicate detection
    pdfStoragePath: text("pdf_storage_path"), // Supabase Storage path (nullable until uploaded)
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),

    // Statement metadata
    statementDate: timestamp("statement_date", { withTimezone: true }),

    // Processing
    processingStatus: processingStatusEnum("processing_status")
      .default("pending")
      .notNull(),
    processingError: text("processing_error"),
    transactionCount: integer("transaction_count").default(0).notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("statements_user_id_idx").on(table.userId),
    index("statements_pdf_hash_idx").on(table.pdfHash),
    uniqueIndex("statements_user_hash_idx").on(table.userId, table.pdfHash), // User-scoped uniqueness
  ]
);

// ============ TRANSACTIONS TABLE ============

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    statementId: uuid("statement_id")
      .notNull()
      .references(() => statements.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Transaction data
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    merchantName: varchar("merchant_name", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    description: text("description"),

    // Deduplication
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(), // merchant+amount+date hash

    // AI metadata
    tagStatus: transactionTagStatusEnum("tag_status")
      .default("unreviewed")
      .notNull(),
    confidenceScore: integer("confidence_score"), // 0-100
    categoryGuess: varchar("category_guess", { length: 100 }),
    rawText: text("raw_text"),
    aiMetadata: jsonb("ai_metadata").$type<{
      categoryGuesses?: string[];
      extractedAt: string;
      model: string;
    }>(),

    // Conversion tracking
    convertedToSubscriptionId: uuid("converted_to_subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" }
    ),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_statement_id_idx").on(table.statementId),
    index("transactions_fingerprint_idx").on(table.fingerprint),
    index("transactions_tag_status_idx").on(table.tagStatus),
    index("transactions_date_idx").on(table.transactionDate),
  ]
);

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  categories: many(categories),
  reminderLogs: many(reminderLogs),
  importAudits: many(importAudits),
  authenticators: many(authenticators),
  recurringPatterns: many(recurringPatterns),
  alerts: many(alerts),
  statements: many(statements),
  transactions: many(transactions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const authenticatorsRelations = relations(authenticators, ({ one }) => ({
  user: one(users, {
    fields: [authenticators.userId],
    references: [users.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(
  subscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [subscriptions.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [subscriptions.categoryId],
      references: [categories.id],
    }),
    importAudit: one(importAudits, {
      fields: [subscriptions.importAuditId],
      references: [importAudits.id],
    }),
    mergedInto: one(subscriptions, {
      fields: [subscriptions.mergedIntoId],
      references: [subscriptions.id],
      relationName: "mergedSubscriptions",
    }),
    mergedFrom: many(subscriptions, {
      relationName: "mergedSubscriptions",
    }),
    reminderLogs: many(reminderLogs),
    alerts: many(alerts),
    convertedFromTransactions: many(transactions),
  })
);

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [reminderLogs.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [reminderLogs.userId],
    references: [users.id],
  }),
}));

export const importAuditsRelations = relations(
  importAudits,
  ({ one, many }) => ({
    user: one(users, {
      fields: [importAudits.userId],
      references: [users.id],
    }),
    subscriptions: many(subscriptions),
  })
);


export const recurringPatternsRelations = relations(recurringPatterns, ({ one }) => ({
  user: one(users, {
    fields: [recurringPatterns.userId],
    references: [users.id],
  }),
  createdSubscription: one(subscriptions, {
    fields: [recurringPatterns.createdSubscriptionId],
    references: [subscriptions.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [alerts.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const statementsRelations = relations(statements, ({ one, many }) => ({
  user: one(users, {
    fields: [statements.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  statement: one(statements, {
    fields: [transactions.statementId],
    references: [statements.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  convertedToSubscription: one(subscriptions, {
    fields: [transactions.convertedToSubscriptionId],
    references: [subscriptions.id],
  }),
}));

// ============ TYPE EXPORTS ============

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type ReminderLog = typeof reminderLogs.$inferSelect;
export type NewReminderLog = typeof reminderLogs.$inferInsert;

export type ImportAudit = typeof importAudits.$inferSelect;
export type NewImportAudit = typeof importAudits.$inferInsert;

export type FxRatesCache = typeof fxRatesCache.$inferSelect;
export type NewFxRatesCache = typeof fxRatesCache.$inferInsert;
export type RecurringPattern = typeof recurringPatterns.$inferSelect;
export type NewRecurringPattern = typeof recurringPatterns.$inferInsert;

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;

export type Statement = typeof statements.$inferSelect;
export type NewStatement = typeof statements.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
