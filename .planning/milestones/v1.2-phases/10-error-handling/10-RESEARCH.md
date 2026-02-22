# Phase 10: Error Handling - Research

**Researched:** 2026-02-04
**Domain:** User-facing error messages, form validation, API retry logic, fallback UI
**Confidence:** HIGH

## Summary

This phase focuses on improving the user experience when things go wrong, replacing technical error messages with helpful, actionable feedback. The existing infrastructure already includes Sonner for toast notifications (configured in Phase 3), React Hook Form with Zod for validation, TanStack Query for API state, and Sentry for error tracking (configured in Phase 9). This phase will enhance these existing tools with better error messages, automatic retry logic, and graceful degradation patterns.

The key insight is that error handling is not about adding new libraries, but about configuring and extending what's already in place. React Hook Form already supports inline validation with custom error messages. TanStack Query already supports retry logic with configurable conditions. The work is primarily about writing better error messages, adding retry configuration, and creating fallback UI components.

**Primary recommendation:** Use existing stack (Sonner, React Hook Form + Zod, TanStack Query) with improved error messages and retry configuration. Focus on message tone, retry conditions, and fallback UI patterns rather than new dependencies.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | ^2.0.7 | Toast notifications | Already configured, supports richColors and manual dismiss |
| react-hook-form | ^7.71.1 | Form validation | Built-in inline error display via FormMessage |
| zod | ^4.3.5 | Schema validation | Custom error messages per field |
| @tanstack/react-query | ^5.90.19 | API state management | Built-in retry logic with conditional rules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod-validation-error | ^3.x | User-friendly Zod errors | Optional - for transforming Zod errors to human-readable messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | react-hot-toast | Similar features but Sonner already integrated |
| Zod custom messages | zod-validation-error | Library adds dependency but standardizes error formatting |
| TanStack Query retry | Manual retry logic | Query retry is declarative and tested |

**Installation (if needed):**
```bash
# Only if using zod-validation-error helper
npm install zod-validation-error
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── validations/         # Existing Zod schemas
│   │   └── subscription.ts  # Add custom error messages
│   ├── hooks/
│   │   └── use-subscriptions.ts  # Add retry configuration
│   └── utils/
│       └── errors.ts        # NEW: Error message helpers
├── components/
│   ├── ui/
│   │   ├── form.tsx         # Already has FormMessage
│   │   └── sonner.tsx       # Already configured
│   └── shared/
│       └── fallback-ui.tsx  # NEW: Service unavailable component
└── app/
    └── error.tsx            # Already exists with Sentry
```

### Pattern 1: User-Friendly API Error Messages
**What:** Transform technical API errors into actionable user messages
**When to use:** All API error handling in mutation hooks

**lib/utils/errors.ts:**
```typescript
// Transform API errors to user-friendly messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("Unauthorized")) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.message.includes("Invalid category")) {
      return "The selected category is not valid. Please choose another.";
    }
    if (error.message.includes("trial has expired")) {
      return "Your trial has expired. Please upgrade to continue.";
    }
    if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    // Generic fallback for other errors
    return "Something went wrong. Please try again.";
  }
  return "An unexpected error occurred. Please try again.";
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors are retryable
    if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
      return true;
    }
    // 503 Service Unavailable is retryable
    if (error.message.includes("503")) {
      return true;
    }
  }
  // Check for Response objects
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    return status === 503 || status === 408; // Service Unavailable or Timeout
  }
  return false;
}
```

### Pattern 2: TanStack Query Retry Configuration
**What:** Configure automatic retries for transient failures
**When to use:** All mutation hooks (create, update, delete)

**Enhanced use-subscriptions.ts:**
```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/mutations
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isRetryableError } from "@/lib/utils/errors";

export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSubscription,
    retry: (failureCount, error) => {
      // Only retry on network errors or 503, not validation errors
      if (!isRetryableError(error)) {
        return false;
      }
      // Retry up to 2 times (3 total attempts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s (max)
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
  });
}
```

### Pattern 3: Inline Form Validation with Custom Messages
**What:** Show validation errors below fields on blur
**When to use:** All forms (already partially implemented)

**Enhanced Zod schema (subscription.ts):**
```typescript
// Source: https://zod.dev/error-customization
import { z } from "zod";

export const createSubscriptionFormSchema = z.object({
  name: z
    .string({ required_error: "This field is required" })
    .min(1, "This field is required")
    .max(255, "Name cannot exceed 255 characters"),
  amount: z
    .number({
      required_error: "This field is required",
      invalid_type_error: "Please enter a valid amount"
    })
    .positive("Amount must be greater than zero")
    .max(999999.99, "Amount cannot exceed $999,999.99"),
  categoryId: z
    .string()
    .uuid("Invalid category")
    .optional()
    .nullable(),
  nextRenewalDate: z
    .date({
      required_error: "Please select a renewal date",
      invalid_type_error: "Please select a valid date"
    }),
  // ... other fields with custom messages
});
```

**Form configuration (already correct):**
```typescript
// Source: https://react-hook-form.com/docs/useform
const form = useForm<CreateSubscriptionInput>({
  resolver: zodResolver(createSubscriptionFormSchema),
  mode: "onBlur",        // Validate on blur (when field loses focus)
  reValidateMode: "onChange", // Clear errors immediately when typing
});
```

### Pattern 4: Toast Notifications for API Errors
**What:** Show user-friendly toasts for mutation errors
**When to use:** All mutation error handlers

**Usage in page components:**
```typescript
// Source: https://ui.shadcn.com/docs/components/sonner
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errors";

const handleSubmit = async (data: CreateSubscriptionInput) => {
  try {
    await createMutation.mutateAsync(data);
    toast.success("Subscription created successfully");
    router.push("/subscriptions");
  } catch (error) {
    // User-friendly error message
    toast.error(getErrorMessage(error), {
      duration: Infinity, // Manual dismiss as per CONTEXT.md
      action: {
        label: "Try again",
        onClick: () => handleSubmit(data),
      },
    });
  }
};
```

### Pattern 5: Import Error Messages
**What:** Specific error messages for PDF import failures
**When to use:** Import flow error handling

**Enhanced import error handling:**
```typescript
// In import page.tsx processFiles function
try {
  const response = await fetch("/api/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();

    // Map API errors to user-friendly messages
    let message = "Unable to process file. Please try again.";

    if (error.error?.includes("too large")) {
      message = "File too large (max 10MB). Please use a smaller file.";
    } else if (error.error?.includes("Invalid PDF")) {
      message = "Invalid PDF format. Please upload a valid PDF file.";
    } else if (error.error?.includes("No transactions")) {
      message = "No transactions found in this statement. Try a different file or add subscriptions manually.";
    } else if (error.error?.includes("OpenAI")) {
      message = "AI service temporarily unavailable. Please try again in a moment.";
    }

    toast.error(message, {
      duration: Infinity,
      action: {
        label: "Try again",
        onClick: () => processFiles(),
      },
    });

    setStep("upload");
    return;
  }

  // ... success handling
} catch (error) {
  toast.error("Unable to process file. Please check your connection and try again.", {
    duration: Infinity,
  });
  setStep("upload");
}
```

### Pattern 6: Fallback UI for External Service Failures
**What:** Show helpful message when external service is unavailable
**When to use:** Components that depend on external services

**components/shared/service-unavailable.tsx:**
```typescript
// Source: https://nextjs.org/docs/app/getting-started/error-handling
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServiceUnavailableProps {
  serviceName?: string;
  onRetry?: () => void;
}

export function ServiceUnavailable({
  serviceName = "This service",
  onRetry
}: ServiceUnavailableProps) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
          <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <CardTitle>Service Temporarily Unavailable</CardTitle>
        <CardDescription>
          {serviceName} is currently unavailable. Please try again in a moment.
        </CardDescription>
      </CardHeader>
      {onRetry && (
        <CardContent className="text-center">
          <Button onClick={onRetry}>Try Again</Button>
        </CardContent>
      )}
    </Card>
  );
}
```

**Usage in components:**
```typescript
// When API call fails with 503
if (error?.status === 503) {
  return <ServiceUnavailable serviceName="Subscription data" onRetry={refetch} />;
}
```

### Anti-Patterns to Avoid
- **Showing raw API error messages to users:** Always transform technical errors
- **Auto-dismissing error toasts:** Users need time to read and act (per CONTEXT.md)
- **Retrying validation errors:** Only retry transient failures (network, 503)
- **Generic "Something went wrong":** Always provide specific, actionable guidance
- **Validating on every keystroke (onChange):** Use onBlur for initial validation (per CONTEXT.md)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic with backoff | Custom setTimeout loops | TanStack Query retry config | Declarative, tested, handles edge cases |
| Form validation UI | Custom error display | React Hook Form FormMessage | Already integrated, accessible |
| Toast notifications | Custom notification component | Sonner (already installed) | Handles positioning, stacking, animations |
| Error message formatting | String concatenation | Zod custom error messages | Type-safe, consistent, declarative |

**Key insight:** The app already has all the infrastructure for excellent error handling. The work is configuration and message writing, not new code or dependencies.

## Common Pitfalls

### Pitfall 1: Destroying formState Proxy
**What goes wrong:** Errors don't appear after validation
**Why it happens:** Destructuring formState too early breaks React Hook Form's proxy
**How to avoid:** Only destructure the specific fields you need, when you need them
**Warning signs:** FormMessage not showing errors, validation seems to not run

```typescript
// BAD - breaks proxy
const { errors, isValid } = form.formState;

// GOOD - access through form
<FormMessage /> // Uses useFormField() internally
```

### Pitfall 2: Retrying Non-Retryable Errors
**What goes wrong:** User sees multiple failed attempts for validation errors
**Why it happens:** Retry logic doesn't check error type
**How to avoid:** Use conditional retry that checks error status/message
**Warning signs:** Validation errors trigger retries, slow user feedback

### Pitfall 3: Mode vs ReValidateMode Mismatch
**What goes wrong:** Errors validate on blur but don't clear when typing
**Why it happens:** mode=onBlur with reValidateMode=onBlur requires re-blur to clear
**How to avoid:** Use mode=onBlur with reValidateMode=onChange (per CONTEXT.md)
**Warning signs:** Users fix input but error remains visible

### Pitfall 4: Exposing Technical Error Details
**What goes wrong:** Users see "TypeError: Cannot read property 'id' of undefined"
**Why it happens:** Directly displaying error.message to users
**How to avoid:** Always transform errors through getErrorMessage() utility
**Warning signs:** Bug reports with stack traces in screenshots

### Pitfall 5: Missing Required Field Prevention
**What goes wrong:** Form submits with empty required fields
**Why it happens:** Client-side validation not preventing submission
**How to avoid:** Zod schema required fields + form.handleSubmit wrapper
**Warning signs:** API returns 400 errors for missing fields

## Code Examples

Verified patterns from official sources:

### Complete Mutation with Error Handling
```typescript
// Source: https://tanstack.com/query/v5/docs/react/guides/mutations
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage, isRetryableError } from "@/lib/utils/errors";

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSubscription,
    retry: (failureCount, error) => {
      if (!isRetryableError(error)) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 2000),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(subscriptionKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
    },
    onError: (error) => {
      // Error already thrown to component, just log to console/Sentry
      console.error("Update subscription failed:", error);
    },
  });
}

// In component
const updateMutation = useUpdateSubscription();

const handleSubmit = async (data: UpdateSubscriptionInput) => {
  try {
    await updateMutation.mutateAsync({ id, data });
    toast.success("Subscription updated successfully");
    router.push("/subscriptions");
  } catch (error) {
    toast.error(getErrorMessage(error), {
      duration: Infinity,
      action: {
        label: "Try again",
        onClick: () => handleSubmit(data),
      },
    });
  }
};
```

### Form with Complete Validation
```typescript
// Source: https://react-hook-form.com/docs/useform
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSubscriptionFormSchema } from "@/lib/validations/subscription";

const form = useForm<CreateSubscriptionInput>({
  resolver: zodResolver(createSubscriptionFormSchema),
  mode: "onBlur",            // Validate when field loses focus
  reValidateMode: "onChange", // Clear errors when typing
  defaultValues: {
    name: "",
    amount: 0,
    // ... other defaults
  },
});

// In JSX
<FormField
  control={form.control}
  name="amount"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Amount</FormLabel>
      <FormControl>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="9.99"
          {...field}
          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
        />
      </FormControl>
      <FormMessage /> {/* Shows Zod error message */}
    </FormItem>
  )}
/>
```

### Toast with Manual Dismiss and Actions
```typescript
// Source: https://ui.shadcn.com/docs/components/sonner
import { toast } from "sonner";

// Error toast with manual dismiss (per CONTEXT.md)
toast.error("Unable to save subscription. Please try again.", {
  duration: Infinity, // Requires manual dismiss
  action: {
    label: "Try again",
    onClick: () => handleRetry(),
  },
});

// Success toast (can auto-dismiss)
toast.success("Subscription created successfully");

// Loading toast with promise
toast.promise(
  mutation.mutateAsync(data),
  {
    loading: "Saving subscription...",
    success: "Subscription saved successfully",
    error: (err) => getErrorMessage(err),
  }
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual error state | TanStack Query error state | v5 2024 | Automatic error handling, retry |
| Global error messages | Inline field errors | React Hook Form v7 | Better UX, clearer feedback |
| Auto-dismiss toasts | Manual dismiss for errors | Sonner best practices | Users have time to act |
| Technical error messages | User-friendly messages | UX best practices 2025+ | Reduced support burden |

**Deprecated/outdated:**
- Zod `.refine()` for simple validations: Use built-in validators with custom messages
- toast.error() without duration: Use `duration: Infinity` for errors (per CONTEXT.md)
- mode="onChange" for all forms: Use onBlur to reduce validation noise

## Open Questions

Things that couldn't be fully resolved:

1. **PDF Import Partial Success Handling**
   - What we know: Import can succeed with some items, fail on others
   - What's unclear: Best UX for showing "5 of 7 imported successfully"
   - Recommendation: Show success toast with warning badge indicating partial success

2. **Network Error Detection Reliability**
   - What we know: Can check error.message for "Failed to fetch"
   - What's unclear: All possible network error messages across browsers
   - Recommendation: Use broad error.message.includes() checks + 503 status code

3. **Form Validation Race Conditions**
   - What we know: Blur validation can conflict with submit timing
   - What's unclear: Edge cases where user submits during blur validation
   - Recommendation: React Hook Form handleSubmit already handles this, no action needed

## Sources

### Primary (HIGH confidence)
- [TanStack Query Mutations](https://tanstack.com/query/v5/docs/react/guides/mutations) - Retry configuration
- [TanStack Query Retries](https://tanstack.com/query/v5/docs/react/guides/query-retries) - Retry patterns
- [React Hook Form useForm](https://react-hook-form.com/docs/useform) - Validation modes
- [Zod Error Customization](https://zod.dev/error-customization) - Custom error messages
- [Sonner Documentation](https://ui.shadcn.com/docs/components/sonner) - Toast API
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling) - Error boundaries

### Secondary (MEDIUM confidence)
- [API Error Handling Best Practices - Postman](https://blog.postman.com/best-practices-for-api-error-handling/) - Error message patterns
- [Modern API Design Best Practices 2026](https://www.xano.com/blog/modern-api-design-best-practices/) - Current standards
- [Sonner Modern Toast Notifications - Medium](https://medium.com/@rivainasution/shadcn-ui-react-series-part-19-sonner-modern-toast-notifications-done-right-903757c5681f) - Best practices

### Tertiary (LOW confidence)
- [GitHub TanStack Query Discussion #4594](https://github.com/TanStack/query/discussions/4594) - Mutation retry examples
- [GitHub React Hook Form Discussion #5138](https://github.com/orgs/react-hook-form/discussions/5138) - onBlur validation issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and documented
- Architecture: HIGH - Patterns from official documentation
- Pitfalls: MEDIUM - Mix of official docs and community reports
- Error messages: MEDIUM - Best practices from multiple sources, some subjective

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain)
