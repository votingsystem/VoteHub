import { getAllPolls } from "@/services/poll-service";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import Link from "next/link";
import { deletePollAction, unpublishPollAction } from "@/actions/poll-actions";

export default async function AdminPollsPage() {
  const { polls } = await getAllPolls();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Manage Polls</h2>
        <Link href="/admin/polls/new">
          <Button>Create New Poll</Button>
        </Link>
      </div>

      {polls.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No polls yet. Create your first poll to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <Card key={poll.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{poll.title}</h3>
                      <PollStatusBadge status={poll.status} />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {poll.description}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>Tag: {poll.tag.name}</span>
                      <span>•</span>
                      <span>{poll._count?.votes || 0} votes</span>
                      <span>•</span>
                      <span>{poll._count?.comments || 0} comments</span>
                      <span>•</span>
                      <span>
                        Ends: {new Date(poll.endAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/poll/${poll.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    {(poll._count?.votes || 0) === 0 && (
                      <Link href={`/admin/polls/${poll.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                    <PollActions
                      pollId={poll.id}
                      hasVotes={(poll._count?.votes || 0) > 0}
                      status={poll.status}
                    />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PollStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    SCHEDULED: { label: "Scheduled", variant: "secondary" as const },
    ACTIVE: { label: "Active", variant: "default" as const },
    CLOSED: { label: "Closed", variant: "outline" as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function PollActions({
  pollId,
  hasVotes,
  status,
}: {
  pollId: string;
  hasVotes: boolean;
  status: string;
}) {
  const handleUnpublish = async () => {
    "use server";
    await unpublishPollAction(pollId);
  };

  const handleDelete = async () => {
    "use server";
    await deletePollAction(pollId);
  };

  return (
    <>
      {status !== "CLOSED" && (
        <form action={handleUnpublish}>
          <Button variant="outline" size="sm" type="submit">
            Close
          </Button>
        </form>
      )}
      {!hasVotes && (
        <form action={handleDelete}>
          <Button variant="outline" size="sm" type="submit">
            Delete
          </Button>
        </form>
      )}
    </>
  );
}
