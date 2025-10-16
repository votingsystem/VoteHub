import { prisma } from "@/lib/prisma";
import { logAuthEvent } from "./auth-service";
import type { GoogleProfile } from "@/types/auth";

/**
 * Link a Google account to an existing user or create a new user
 * Implements email-based automatic account linking for migration
 *
 * @param googleProfile - Google OAuth profile data
 * @returns userId of the linked or newly created account
 */
export async function linkGoogleAccount(
  googleProfile: GoogleProfile
): Promise<string> {
  // 1. Check if Google account is already linked
  const existingOAuthAccount = await prisma.account.findUnique({
    where: {
      providerId_accountId: {
        providerId: "google",
        accountId: googleProfile.id,
      },
    },
  });

  if (existingOAuthAccount) {
    // Google account already linked - return existing user
    return existingOAuthAccount.userId;
  }

  // 2. Check for existing user with matching email (migration scenario)
  const existingUser = await prisma.user.findUnique({
    where: { email: googleProfile.email },
  });

  if (existingUser) {
    // 3. Link Google account to existing user (MIGRATION)
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        providerId: "google",
        accountId: googleProfile.id,
        accessToken: googleProfile.accessToken,
        expiresAt: googleProfile.tokenExpiresAt,
      },
    });

    // 4. Update user profile with Google data
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        googleId: googleProfile.id,
        googleEmail: googleProfile.email,
        googleProfilePicture: googleProfile.picture,
        lastGoogleSync: new Date(),
        name: googleProfile.name || existingUser.name, // Preserve existing name if Google doesn't provide one
      },
    });

    // Log migration event (FR-016)
    await logAuthEvent({
      eventType: "account_creation",
      userId: existingUser.id,
      success: true,
    });

    return existingUser.id;
  }

  // 5. No existing user - create new account
  const newUser = await prisma.user.create({
    data: {
      email: googleProfile.email,
      name: googleProfile.name,
      username: generateUsernameFromEmail(googleProfile.email),
      googleId: googleProfile.id,
      googleEmail: googleProfile.email,
      googleProfilePicture: googleProfile.picture,
      lastGoogleSync: new Date(),
      role: "VOTER", // Default role for new users
    },
  });

  // Create OAuth account link
  await prisma.account.create({
    data: {
      userId: newUser.id,
      providerId: "google",
      accountId: googleProfile.id,
      accessToken: googleProfile.accessToken,
      expiresAt: googleProfile.tokenExpiresAt,
    },
  });

  // Log new account creation (FR-016)
  await logAuthEvent({
    eventType: "account_creation",
    userId: newUser.id,
    success: true,
  });

  return newUser.id;
}

/**
 * Generate a unique username from email
 * Format: email prefix + random suffix if needed
 */
function generateUsernameFromEmail(email: string): string {
  const prefix = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_-]/g, "_");
  const randomSuffix = Math.floor(Math.random() * 10000);
  return `${prefix}_${randomSuffix}`;
}

/**
 * Clean up unmigrated accounts after grace period (30 days)
 * Implements FR-017 requirement
 *
 * @param deploymentDate - Date when OAuth migration was deployed
 */
export async function cleanupUnmigratedAccounts(
  deploymentDate: Date
): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Check if grace period has expired
  if (thirtyDaysAgo < deploymentDate) {
    console.log("Grace period not expired yet");
    return 0;
  }

  // Find users with password but no Google account link
  const unmigratedUsers = await prisma.user.findMany({
    where: {
      password: { not: null }, // Has password (legacy account)
      googleId: null, // Not linked to Google
      accounts: { none: {} }, // No OAuth accounts
      createdAt: { lt: deploymentDate }, // Created before migration
    },
  });

  let deletedCount = 0;

  for (const user of unmigratedUsers) {
    try {
      // Log deletion event (FR-016)
      await logAuthEvent({
        eventType: "account_creation", // Reuse for account lifecycle
        userId: user.id,
        success: true,
        errorMessage: "Account deleted - unmigrated after 30-day grace period",
      });

      // Cascade delete: user, sessions, votes, polls, comments (Prisma relations)
      await prisma.user.delete({ where: { id: user.id } });

      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete unmigrated user ${user.id}:`, error);
    }
  }

  console.log(`Deleted ${deletedCount} unmigrated accounts`);
  return deletedCount;
}
