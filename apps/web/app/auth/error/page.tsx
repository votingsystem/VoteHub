import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@workspace/ui/components/button";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  oauth_callback_error: {
    title: "Sign-in failed",
    description: "Failed to complete Google sign-in. Please try again.",
  },
  unauthorized: {
    title: "Sign-in cancelled",
    description: "Sign-in was cancelled or unauthorized.",
  },
  rate_limit: {
    title: "Too many attempts",
    description: "Too many sign-in attempts. Please wait and try again.",
  },
  network_error: {
    title: "Network error",
    description: "Network error. Please check your connection.",
  },
  service_unavailable: {
    title: "Service unavailable",
    description: "Google sign-in is temporarily unavailable.",
  },
  unknown: {
    title: "Unexpected error",
    description: "An unexpected error occurred. Please try again.",
  },
};

export const metadata = {
  title: "Authentication Error - VoteHub",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorCode = params.error || "unknown";
  const errorInfo = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown!;

  return (
    <Suspense fallback={<ErrorSkeleton />}>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight">VoteHub</h1>
          </div>

          <div className="rounded-lg border border-red-200 bg-card p-8 shadow-sm dark:border-red-800">
            <div className="space-y-6">
              <div className="flex items-start gap-4" role="alert" aria-live="assertive">
                <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20" aria-hidden="true">
                  <svg
                    className="h-6 w-6 text-red-600 dark:text-red-400"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
                    {errorInfo.title}
                  </h2>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {errorInfo.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href="/sign-in">Try again</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/">Go home</Link>
                </Button>
              </div>

              {errorCode === "rate_limit" && (
                <p className="text-xs text-muted-foreground">
                  Please wait a minute before trying again.
                </p>
              )}

              {errorCode === "service_unavailable" && (
                <p className="text-xs text-muted-foreground">
                  Google sign-in is temporarily unavailable. Please try again in
                  a few minutes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}

function ErrorSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-10 flex-1 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
