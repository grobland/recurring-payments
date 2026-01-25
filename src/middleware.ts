import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/subscriptions",
  "/import",
  "/analytics",
  "/reminders",
  "/settings",
  "/onboarding",
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

// Public routes (no auth required)
const publicRoutes = ["/", "/pricing", "/privacy", "/terms"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

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
    const onboardingCompleted = req.auth?.user?.onboardingCompleted;
    if (!onboardingCompleted) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // For protected routes, check if onboarding is needed
  if (isProtectedRoute && isLoggedIn) {
    const onboardingCompleted = req.auth?.user?.onboardingCompleted;
    if (!onboardingCompleted && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    // If onboarding is completed and user tries to access /onboarding, redirect to dashboard
    if (onboardingCompleted && pathname === "/onboarding") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
  }

  return NextResponse.next();
});

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
