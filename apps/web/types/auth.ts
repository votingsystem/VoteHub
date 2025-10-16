// Auth types for BetterAuth + Google OAuth
import { Session as BetterAuthSession, User as BetterAuthUser } from "better-auth";

// Re-export BetterAuth types
export type Session = BetterAuthSession;
export type User = BetterAuthUser;

// Google OAuth profile data (received from OAuth callback)
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  tokenExpiresAt?: Date;
}

// Auth event types for logging (FR-016)
export type AuthEventType =
  | "login"
  | "logout"
  | "failed_attempt"
  | "account_creation"
  | "token_expiration";

export interface AuthEvent {
  eventType: AuthEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp?: Date;
}
