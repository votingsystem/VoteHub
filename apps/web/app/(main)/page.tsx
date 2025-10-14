import { getActivePolls } from "@/services/poll-service";
import { getTags } from "@/services/tag-service";
import { PollCard } from "@workspace/ui/components/voting/poll-card";
import { FeedFilters } from "./feed-filters";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const sort =
    (params.sort as "newest" | "most-voted" | "trending") || "newest";
  const tagSlug = params.tag;

  const [{ polls }, tags] = await Promise.all([
    getActivePolls({ limit: 20, sort, tagSlug }),
    getTags(),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Active Polls</h1>
        <p className="text-muted-foreground mt-2">
          Vote on active polls and see real-time results
        </p>
      </div>

      <FeedFilters tags={tags} currentSort={sort} currentTag={tagSlug} />

      {polls.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No active polls at the moment.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Check back later or create one if you're an admin!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
