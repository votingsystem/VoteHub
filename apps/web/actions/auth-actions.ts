"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * Login action - authenticates user with email and password
 */
export async function loginAction(
  formData: FormData,
): Promise<{ error: string } | never> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const headersList = await headers();
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: headersList,
    });

    if (!result) {
      return { error: "Invalid email or password" };
    }

    redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    return { error: "Failed to login. Please try again." };
  }
}

/**
 * Register action - creates new user account with voter role
 */
export async function registerAction(
  formData: FormData,
): Promise<{ error: string } | never> {
  const email = formData.get("email") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!email || !username || !password) {
    return { error: "All fields are required" };
  }

  // Validate username format
  if (username.length < 3 || username.length > 20) {
    return { error: "Username must be between 3 and 20 characters" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      error:
        "Username can only contain letters, numbers, hyphens, and underscores",
    };
  }

  // Validate password strength
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return { error: "Email already registered" };
      }
      return { error: "Username already taken" };
    }

    // Create user with hashed password
    const hashedPassword = await hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "VOTER", // Default role
      },
    });

    // Auto-login after registration
    const headersList = await headers();
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: headersList,
    });

    redirect("/");
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Failed to create account. Please try again." };
  }
}

/**
 * Logout action - ends user session
 */
export async function logoutAction(): Promise<{ error: string } | never> {
  try {
    const headersList = await headers();
    await auth.api.signOut({
      headers: headersList,
    });

    redirect("/login");
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "Failed to logout" };
  }
}

/**
 * Get current session - for use in Server Components
 */
export async function getSession() {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({
      headers: headersList,
    });

    return session;
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}
