import { cleanupExpiredSessions } from "@/lib/cron/cleanup-expired-sessions";
import { NextResponse } from "next/server";

/**
 * Cron job endpoint for cleaning up expired sessions
 * Called hourly by Vercel Cron
 * Reference: Session Management Contract - Automatic Expiration
 */
export async function GET(request: Request) {
  try {
    // Verify the request is coming from Vercel Cron
    // In production, this should check the authorization header
    const authHeader = request.headers.get("authorization");

    if (process.env.NODE_ENV === "production") {
      // Vercel Cron sends Bearer token with CRON_SECRET
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // Run the cleanup
    const deletedCount = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Session cleanup failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
