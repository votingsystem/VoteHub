import { prisma } from "@/lib/prisma";

/**
 * Clean up expired sessions from the database
 * This function is designed to be called by a cron job
 * Reference: Session Management Contract - Automatic Expiration section
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    // Delete all sessions where expiresAt is in the past
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const deletedCount = result.count;

    // Log the cleanup operation
    console.log(
      `[Session Cleanup] Deleted ${deletedCount} expired session(s) at ${new Date().toISOString()}`
    );

    return deletedCount;
  } catch (error) {
    console.error("[Session Cleanup] Error cleaning up expired sessions:", error);
    throw error;
  }
}
