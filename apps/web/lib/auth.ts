import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: false, // T043: Disabled in favor of Google OAuth exclusive authentication
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account", // Always prompt account selection
      accessType: "offline", // Get refresh tokens (future-proof)
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "VOTER", // All registrations default to voter
        required: true,
      },
      username: {
        type: "string",
        required: false, // Generated in onAPIResponse hook from email
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours (FR-005 requirement)
    updateAge: 60 * 60 * 12, // Refresh session if used within 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cookie cache for performance
    },
  },
  rateLimit: {
    enabled: true, // FR-018: 10 auth attempts/minute
    window: 60,
    max: 10,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 },
    },
  },
  secret: process.env.AUTH_SECRET!,
  baseURL: process.env.AUTH_URL!,
  plugins: [nextCookies()], // Required for Next.js cookie management
  onAPIRequest: {
    signInSocial: async (request: any) => {
      // Hook runs before social sign-in - no action needed here
      return request;
    },
  },
  onAPIResponse: {
    signInSocial: async (response: any) => {
      // T038: Profile picture sync logic + username generation
      // After successful Google sign-in, update user profile with latest Google data
      if (response.body && "user" in response.body) {
        const user = response.body.user as any;

        // Fetch current user data
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { username: true, email: true },
        });

        if (!existingUser) return response;

        const updateData: any = {
          googleProfilePicture: user.image || null, // BetterAuth stores profile image in user.image
          lastGoogleSync: new Date(),
          name: user.name || null, // Update name from Google
        };

        // Generate username from email if not set (new user)
        if (!existingUser.username && existingUser.email) {
          let username: string;
          let attempt = 0;
          const maxAttempts = 10;

          // Try to generate unique username
          do {
            const prefix = existingUser.email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9_-]/g, "_");
            const randomSuffix = Math.floor(Math.random() * 10000);
            username = `${prefix}_${randomSuffix}`;

            // Check if username already exists
            const existing = await prisma.user.findUnique({
              where: { username },
            });

            if (!existing) {
              updateData.username = username;
              break;
            }
            attempt++;
          } while (attempt < maxAttempts);

          // Fallback: use timestamp if all attempts failed
          if (!updateData.username) {
            const prefix = existingUser.email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9_-]/g, "_");
            updateData.username = `${prefix}_${Date.now()}`;
          }
        }

        // Update user with latest Google profile data
        await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }

      return response;
    },
  },
  // T047: Authentication error tracking
  // BetterAuth doesn't support onAPIError wildcard handler in current version
  // Error logging implemented via try-catch blocks in auth-actions.ts and service layer
  // TODO: When BetterAuth supports global error handlers, implement here
  // For now, errors are logged in:
  // - apps/web/actions/auth-actions.ts (Server Actions)
  // - apps/web/services/auth-service.ts (Service layer)
  // - apps/web/services/migration-service.ts (Migration logic)
});

export type Session = typeof auth.$Infer.Session;
// Export User type from better-auth inference
export type User = typeof auth.$Infer.Session.user;
