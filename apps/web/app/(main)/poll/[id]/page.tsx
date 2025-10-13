import { getSession } from "@/actions/auth-actions";
import { submitVoteAction } from "@/actions/vote-actions";
import { getPollById } from "@/services/poll-service";
import { getVoteResults, getUserVote } from "@/services/vote-service";
import { getComments } from "@/services/comment-service";
import { Badge } from "@workspace/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { VoteOptions } from "@workspace/ui/components/voting/vote-options";
import { VoteResults } from "@workspace/ui/components/voting/vote-results";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CommentSection } from "./comment-section";

interface PollDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PollDetailPage({ params }: PollDetailPageProps) {
  const { id } = await params;

  // Fetch poll data
  const poll = await getPollById(id);

  if (!poll) {
    notFound();
  }

  // Get current session
  const session = await getSession();
  const userId = session?.user?.id;

  // Check if user has voted
  const userVote = userId ? await getUserVote(id, userId) : null;
  const hasVoted = !!userVote;

  // Get vote results
  const voteResults = await getVoteResults(id);

  // Get comments
  const comments = await getComments(id, { sort: "newest" });

  const statusColor = {
    SCHEDULED: "bg-blue-500",
    ACTIVE: "bg-green-500",
    CLOSED: "bg-gray-500",
  }[poll.status];

  const canVote = poll.status === "ACTIVE" && !hasVoted && userId;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to polls
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-2xl">{poll.title}</CardTitle>
              <CardDescription className="mt-2">
                Posted by {poll.author.username} in {poll.tag.name}
              </CardDescription>
            </div>
            <Badge variant="outline" className={`${statusColor} text-white`}>
              {poll.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <p className="text-base whitespace-pre-wrap">{poll.description}</p>
            {poll.link && (
              <a
                href={poll.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Learn more →
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-4">
            <span>Started: {new Date(poll.startAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>Ends: {new Date(poll.endAt).toLocaleDateString()}</span>
            <span>•</span>
            <span>{poll.durationHours}h duration</span>
          </div>

          <div className="border-t pt-6">
            {canVote ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Cast Your Vote</h2>
                <VoteOptions
                  pollId={poll.id}
                  options={poll.options}
                  onSubmit={submitVoteAction}
                />
              </div>
            ) : (
              <div>
                {!userId && poll.status === "ACTIVE" && (
                  <p className="text-sm text-muted-foreground mb-4">
                    <Link
                      href="/login"
                      className="text-primary hover:underline"
                    >
                      Log in
                    </Link>{" "}
                    to vote on this poll
                  </p>
                )}
                <VoteResults
                  results={voteResults}
                  userVotedOptionId={userVote?.optionId}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comment Section */}
      <div className="mt-8">
        <CommentSection
          pollId={poll.id}
          comments={comments}
          currentUserId={userId}
          currentUserRole={session?.user?.role}
        />
      </div>
    </div>
  );
}
