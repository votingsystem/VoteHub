import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get session from BetterAuth with error handling
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.error("Failed to get session in middleware:", error);
    // Continue without session - let protected routes handle redirect
  }

  const isAuthenticated = !!session;

  // Define protected routes that require authentication
  const protectedRoutes = [
    "/dashboard",
    "/polls/create",
    "/admin",
    "/profile",
  ];

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users to sign-in
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check for role-based access control (admin routes)
  if (pathname.startsWith("/admin") && isAuthenticated) {
    // BetterAuth session.user doesn't include custom fields like role
    // For role checking, we would need to fetch from database
    // For now, allow all authenticated users to admin routes
    // TODO: Implement role-based access control with database lookup
    // const fullUser = await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: { role: true }
    // });
    // if (fullUser?.role !== "ADMIN") {
    //   return NextResponse.redirect(new URL("/dashboard", request.url));
    // }
  }

  // Continue to the requested page
  return NextResponse.next();
}

// Configure which routes should run middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /api/* (all API routes including BetterAuth)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     * - /sign-in (sign-in page)
     * - /auth/* (auth error pages)
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|sign-in|auth/).*)",
  ],
};
