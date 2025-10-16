import { cleanupUnmigratedAccounts } from "@/services/migration-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * T045: Cron job to clean up unmigrated accounts after 30-day grace period
 * Runs daily at midnight (0 0 * * *)
 *
 * Security: Vercel Cron uses authorization header or CRON_SECRET env var
 * Reference: FR-017 requirement for 30-day retention
 */
export async function GET(request: NextRequest) {
  // Verify authorization (Vercel Cron sends authorization header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify CRON_SECRET
  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // IMPORTANT: Set the deployment date manually here
    // This should be the date when Google OAuth migration was deployed to production
    // Example: const deploymentDate = new Date('2025-10-16T00:00:00Z');
    const deploymentDate = new Date(
      process.env.OAUTH_DEPLOYMENT_DATE || "2025-10-16T00:00:00Z"
    );

    const deletedCount = await cleanupUnmigratedAccounts(deploymentDate);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} unmigrated accounts`,
      deploymentDate: deploymentDate.toISOString(),
    });
  } catch (error) {
    console.error("Cleanup unmigrated accounts cron error:", error);
    return NextResponse.json(
      {
        error: "Failed to cleanup unmigrated accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Only allow GET requests (Vercel Cron)
export const dynamic = "force-dynamic";
