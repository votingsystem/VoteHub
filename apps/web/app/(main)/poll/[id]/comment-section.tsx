"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { CommentThread } from "@workspace/ui/components/voting/comment-thread";
import {
  addCommentAction,
  deleteCommentAction,
} from "@/actions/comment-actions";
import Link from "next/link";

interface Comment {
  id: string;
  text: string;
  createdAt: Date | string;
  author: {
    id: string;
    username: string;
  };
  replies?: Comment[];
  _count?: {
    replies: number;
  };
}

interface CommentSectionProps {
  pollId: string;
  comments: Comment[];
  currentUserId?: string;
  currentUserRole?: string;
}

export function CommentSection({
  pollId,
  comments,
  currentUserId,
  currentUserRole,
}: CommentSectionProps) {
  const router = useRouter();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddComment = async (text: string, parentId?: string) => {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("pollId", pollId);
    if (parentId) {
      formData.append("parentId", parentId);
    }

    const result = await addCommentAction(formData);

    if (result.error) {
      throw new Error(result.error);
    }

    router.refresh();
  };

  const handleDeleteComment = async (commentId: string) => {
    const result = await deleteCommentAction(commentId, pollId);

    if (result.error) {
      throw new Error(result.error);
    }

    router.refresh();
  };

  const handleSubmitTopLevel = async () => {
    if (!commentText.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await handleAddComment(commentText);
      setCommentText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Discussion ({comments.length}{" "}
          {comments.length === 1 ? "comment" : "comments"})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Comment Form */}
        {currentUserId ? (
          <div className="space-y-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={handleSubmitTopLevel}
              disabled={isSubmitting || !commentText.trim()}
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>{" "}
              to join the discussion
            </p>
          </div>
        )}

        {/* Comments Thread */}
        {comments.length > 0 ? (
          <div className="border-t pt-6">
            <CommentThread
              comments={comments}
              pollId={pollId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
