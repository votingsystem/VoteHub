import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";

export default function HomeLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        <div className="h-5 w-96 bg-muted animate-pulse rounded mt-2" />
      </div>

      {/* Filters skeleton */}
      <div className="mb-6 flex gap-4">
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded ml-auto" />
      </div>

      {/* Poll cards skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="space-y-3">
                <div className="h-7 bg-muted animate-pulse rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
              </div>

              <div className="flex gap-4 mt-4 pt-4 border-t">
                <div className="h-4 bg-muted animate-pulse rounded w-20" />
                <div className="h-4 bg-muted animate-pulse rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
