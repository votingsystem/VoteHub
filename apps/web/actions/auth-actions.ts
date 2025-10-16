"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuthEvent } from "@/services/auth-service";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * @deprecated T043 - Email/password authentication disabled in favor of Google OAuth
 * This function is no longer active. Use Google OAuth via /sign-in page.
 * Will be removed after 30-day migration period.
 */
/*
export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | never> {
  return { error: "Email/password login is no longer supported. Please use Google Sign-In." };
}
*/

/**
 * @deprecated T043 - Email/password registration disabled in favor of Google OAuth
 * This function is no longer active. Use Google OAuth via /sign-in page.
 * Will be removed after 30-day migration period.
 */
/*
export async function registerAction(
  formData: FormData,
): Promise<{ error: string } | never> {
  return { error: "Email/password registration is no longer supported. Please use Google Sign-In." };
}
*/

/**
 * Logout action - ends user session
 * Updated for Google OAuth - logs sign-out event (FR-016)
 */
export async function logoutAction(): Promise<{ error: string } | never> {
  try {
    const headersList = await headers();

    // Get current session before signing out
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (session) {
      // Log sign-out event (FR-016)
      await logAuthEvent({
        eventType: "logout",
        userId: session.user.id,
        ipAddress: headersList.get("x-forwarded-for")?.split(",")[0] || undefined,
        userAgent: headersList.get("user-agent") || undefined,
        success: true,
      });
    }

    // Sign out using BetterAuth
    await auth.api.signOut({
      headers: headersList,
    });

    redirect("/");
  } catch (error) {
    console.error("Logout error:", error);

    // Log failed sign-out attempt
    await logAuthEvent({
      eventType: "logout",
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return { error: "Failed to logout" };
  }
}

/**
 * Sign out action - alias for logoutAction
 * Used with Google OAuth sign-out button
 */
export const signOutAction = logoutAction;

/**
 * Get current session with full user data - for use in Server Components
 * Fetches additional Google OAuth fields from database
 */
export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    if (!session) {
      return null;
    }

    // Fetch full user data from database to include Google OAuth fields
    const fullUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        googleId: true,
        googleEmail: true,
        googleProfilePicture: true,
        lastGoogleSync: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!fullUser) {
      return null;
    }

    // Merge BetterAuth session with full user data
    return {
      ...session,
      user: {
        ...session.user,
        ...fullUser,
      },
    };
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}
