import type { User } from "@prisma/client";

export type { User };

export enum UserRole {
  ADMIN = "ADMIN",
  VOTER = "VOTER",
}

// Public user profile (excludes sensitive data)
export type PublicUser = Pick<User, "id" | "username" | "createdAt"> & {
  role: UserRole;
};

// User session data
export type UserSession = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};
