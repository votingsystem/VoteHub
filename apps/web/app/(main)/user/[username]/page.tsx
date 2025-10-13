import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import Link from "next/link";

/**
 * User Profile Page
 * Displays user information and comment history
 * Route: /user/[username]
 */

interface UserProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}

export default async function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { username } = await params;

  // Fetch user with comment history
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      comments: {
        include: {
          poll: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50, // Limit to most recent 50 comments
      },
    },
  });

  if (!user) {
    notFound();
  }

  // Format join date
  const joinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* User Header */}
      <Card className="mb-8 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="mt-2 text-muted-foreground">
              Member since {joinDate}
            </p>
          </div>
          <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
            {user.role}
          </Badge>
        </div>
      </Card>

      {/* Comment History */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Comment History</h2>

        {user.comments.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No activity yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {user.comments.map((comment) => (
              <Card key={comment.id} className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <Link
                    href={`/poll/${comment.poll.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {comment.poll.title}
                  </Link>
                  <time className="text-sm text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {comment.text}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: UserProfilePageProps) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
    },
  });

  if (!user) {
    return {
      title: "User Not Found",
    };
  }

  return {
    title: `${user.username}'s Profile | VoteHub`,
    description: `View ${user.username}'s profile and comment history on VoteHub`,
  };
}
