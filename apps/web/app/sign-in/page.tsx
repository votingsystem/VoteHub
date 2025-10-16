import { Suspense } from "react";
import { GoogleSignInButton } from "@workspace/ui/components/auth/google-sign-in-button";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const metadata = {
  title: "Sign In - VoteHub",
  description: "Sign in to VoteHub with your Google account",
};

export default async function SignInPage() {
  // Check if user is already authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">VoteHub</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to create and vote on polls
          </p>
        </div>

        <Suspense fallback={<SignInSkeleton />}>
          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in with your Google account to continue
                </p>
              </div>

              <GoogleSignInButton />

              <div className="text-center text-xs text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="/terms" className="underline hover:text-foreground">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className="underline hover:text-foreground">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}

function SignInSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
