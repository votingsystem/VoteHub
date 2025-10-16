export default function SignInLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-10 w-32 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-2 h-4 w-48 animate-pulse rounded bg-muted" />
        </div>

        <div className="rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-12 w-full animate-pulse rounded bg-muted" />
            <div className="mx-auto h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
