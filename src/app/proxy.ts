import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",      // kept — redirect fires before proxy anyway, harmless
  "/payments",       // NEW — covers all /payments/* routes via startsWith check
  "/vault",          // NEW — covers /vault and /vault/load
  "/accounts",       // NEW — data Vault placeholder page
  "/subscriptions",  // kept for safety during transition
  "/import",         // kept for safety during transition
  "/analytics",      // kept for safety during transition
  "/reminders",      // kept for safety during transition
  "/sources",        // NEW — was implicitly unprotected, add for completeness
  "/settings",
  "/onboarding",
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const pathname = nextUrl.pathname;

  // Get the JWT token to check auth status
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  const isLoggedIn = !!token;

  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the path is an auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect to login if accessing protected route while not logged in
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthRoute && isLoggedIn) {
    // Check if user needs onboarding
    const onboardingCompleted = token?.onboardingCompleted;
    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.redirect(new URL("/payments/dashboard", nextUrl));
  }

  // For protected routes, check if onboarding is needed
  if (isProtectedRoute && isLoggedIn) {
    const onboardingCompleted = token?.onboardingCompleted;
    if (!onboardingCompleted && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    // If onboarding is completed and user tries to access /onboarding, redirect to dashboard
    if (onboardingCompleted && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/payments/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
};
