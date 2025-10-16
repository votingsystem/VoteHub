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
        required: true,
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
      // T038: Profile picture sync logic
      // After successful Google sign-in, update user profile with latest Google data
      if (response.body && "user" in response.body) {
        const user = response.body.user as any;

        // Get account data to access Google profile information
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            providerId: "google",
          },
        });

        if (account) {
          // Update user with latest Google profile data
          // BetterAuth stores profile image in user.image, sync to our custom field
          await prisma.user.update({
            where: { id: user.id },
            data: {
              googleProfilePicture: user.image || null, // BetterAuth stores profile image in user.image
              lastGoogleSync: new Date(),
              name: user.name || null, // Update name from Google
            },
          });
        }
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
