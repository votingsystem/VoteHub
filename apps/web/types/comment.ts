import type { Comment, User } from "@prisma/client";

export type { Comment };

// Comment with author and nested replies
export type CommentWithRelations = Comment & {
  author: Pick<User, "id" | "username">;
  replies?: CommentWithRelations[];
};

// Comment creation input
export type CreateCommentInput = {
  text: string;
  pollId: string;
  parentId?: string; // For threaded replies
};
