"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../button";
import { Textarea } from "../textarea";

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

interface CommentThreadProps {
  comments: Comment[];
  pollId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onAddComment: (text: string, parentId?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  depth?: number;
  maxDepth?: number;
}

export function CommentThread({
  comments,
  pollId,
  currentUserId,
  currentUserRole,
  onAddComment,
  onDeleteComment,
  depth = 0,
  maxDepth = 5,
}: CommentThreadProps) {
  return (
    <div className={depth > 0 ? "ml-6 mt-4" : "space-y-4"}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          pollId={pollId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          depth={depth}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  pollId: string;
  currentUserId?: string;
  currentUserRole?: string;
  onAddComment: (text: string, parentId?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  depth: number;
  maxDepth: number;
}

function CommentItem({
  comment,
  pollId,
  currentUserId,
  currentUserRole,
  onAddComment,
  onDeleteComment,
  depth,
  maxDepth,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canReply = depth < maxDepth && currentUserId;
  const canDelete =
    currentUserId &&
    (comment.author.id === currentUserId || currentUserRole === "ADMIN");

  const handleReply = async () => {
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(replyText, comment.id);
      setReplyText("");
      setIsReplying(false);
    } catch (error) {
      console.error("Failed to add reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment and all its replies?")) return;

    setIsDeleting(true);
    try {
      await onDeleteComment(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className={`${depth > 0 ? "border-l-2 border-muted pl-4" : ""}`}>
      <div className="bg-card rounded-lg p-4 border">
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href={`/user/${comment.author.username}`}
              className="font-medium text-foreground hover:underline"
            >
              {comment.author.username}
            </Link>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>

        {/* Comment Text */}
        <p className="text-foreground whitespace-pre-wrap mb-3">
          {comment.text}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canReply && !isReplying && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReplying(true)}
            >
              Reply
            </Button>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {comment.replies.length}{" "}
              {comment.replies.length === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <div className="mt-4 space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleReply}
                disabled={isSubmitting || !replyText.trim()}
              >
                {isSubmitting ? "Posting..." : "Post Reply"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsReplying(false);
                  setReplyText("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          <CommentThread
            comments={comment.replies}
            pollId={pollId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        </div>
      )}
    </div>
  );
}
