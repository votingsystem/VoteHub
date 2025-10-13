import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";

export default function PollDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 h-5 w-32 bg-muted animate-pulse rounded" />

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-full" />
            <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
            <div className="h-4 bg-muted animate-pulse rounded w-4/6" />
          </div>

          <div className="flex gap-4 border-t pt-4">
            <div className="h-4 bg-muted animate-pulse rounded w-32" />
            <div className="h-4 bg-muted animate-pulse rounded w-32" />
            <div className="h-4 bg-muted animate-pulse rounded w-24" />
          </div>

          <div className="border-t pt-6 space-y-3">
            <div className="h-6 bg-muted animate-pulse rounded w-32" />
            <div className="h-12 bg-muted animate-pulse rounded w-full" />
            <div className="h-12 bg-muted animate-pulse rounded w-full" />
            <div className="h-12 bg-muted animate-pulse rounded w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
