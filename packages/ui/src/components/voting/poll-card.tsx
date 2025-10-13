import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../card";
import { Badge } from "../badge";
import Link from "next/link";
import type { PollWithRelations } from "@/types/poll";

interface PollCardProps {
  poll: PollWithRelations;
  compact?: boolean;
}

export function PollCard({ poll, compact = true }: PollCardProps) {
  const statusColor = {
    SCHEDULED: "bg-blue-500",
    ACTIVE: "bg-green-500",
    CLOSED: "bg-gray-500",
  }[poll.status];

  const timeRemaining = getTimeRemaining(poll.endAt);

  return (
    <Link href={`/poll/${poll.id}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="line-clamp-2">{poll.title}</CardTitle>
              <CardDescription className="mt-1">
                Posted by {poll.author.username} • {poll.tag.name}
              </CardDescription>
            </div>
            <Badge variant="outline" className={`${statusColor} text-white`}>
              {poll.status}
            </Badge>
          </div>
        </CardHeader>

        {!compact && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {poll.description}
            </p>
          </CardContent>
        )}

        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{poll._count?.votes || 0} votes</span>
            <span>{poll._count?.comments || 0} comments</span>
            {poll.status === "ACTIVE" && (
              <span className="ml-auto text-xs">{timeRemaining}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function getTimeRemaining(endAt: Date): string {
  const now = new Date();
  const diff = endAt.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m remaining`;
}
