import { prisma } from "@/lib/prisma";
import type { AuthEvent } from "@/types/auth";
import { randomBytes } from "crypto";

/**
 * Create a new session for a user
 * @param userId - User ID to create session for
 * @param request - Request object to extract IP and user agent
 * @returns Session token
 */
export async function createSession(
  userId: string,
  request?: Request
): Promise<string> {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Extract IP and user agent from request
  const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0] || null;
  const userAgent = request?.headers.get("user-agent") || null;

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return token;
}

/**
 * Validate a session token
 * @param token - Session token to validate
 * @returns User session or null if invalid/expired
 */
export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    // Log expiration event
    await logAuthEvent({
      eventType: "token_expiration",
      userId: session.userId,
      success: true,
    });

    // Delete expired session
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Check if session needs refresh (older than 12 hours)
  const sessionAge = Date.now() - session.createdAt.getTime();
  const twelveHours = 12 * 60 * 60 * 1000;

  if (sessionAge >= twelveHours) {
    // Extend session by 24 hours
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: newExpiresAt },
    });
  }

  return session;
}

/**
 * Generate a secure random token
 * @returns Base64-encoded secure random string
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Log an authentication event (FR-016)
 * @param event - Auth event details
 */
export async function logAuthEvent(event: AuthEvent): Promise<void> {
  await prisma.authEvent.create({
    data: {
      userId: event.userId || null,
      eventType: event.eventType.toUpperCase() as any,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
      success: event.success,
      errorMessage: event.errorMessage || null,
      timestamp: event.timestamp || new Date(),
    },
  });
}
