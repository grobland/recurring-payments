import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

type Handler = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withLogging(handler: Handler, routeName: string): Handler {
  return async (req, context) => {
    const start = Date.now();
    const log = logger.child({
      route: routeName,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    log.info("Request started");

    try {
      const response = await handler(req, context);
      const duration = Date.now() - start;

      log.info({
        status: response.status,
        duration,
      }, "Request completed");

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      log.error({
        error: error instanceof Error ? error.message : "Unknown error",
        duration
      }, "Request failed");
      throw error;
    }
  };
}

// User action logger for login, import, subscription CRUD
export const actionLog = logger.child({ module: "user-actions" });

// Example usage documented in comments:
//
// For API routes:
// import { withLogging } from "@/lib/api-logger";
// export const GET = withLogging(async (req) => { ... }, "GET /api/subscriptions");
//
// For user actions:
// import { actionLog } from "@/lib/api-logger";
// actionLog.info({ action: "login", userId: user.id, method: "credentials" }, "User logged in");
