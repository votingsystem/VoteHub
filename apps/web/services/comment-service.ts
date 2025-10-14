import { prisma } from "@/lib/prisma";

/**
 * Comment Service
 * Handles comment operations for poll discussions with threaded replies
 */

/**
 * Get comments for a poll with nested replies
 * Returns top-level comments with their reply chains
 */
export async function getComments(
  pollId: string,
  options?: {
    sort?: "newest" | "oldest";
    maxDepth?: number;
  },
) {
  const { sort = "newest", maxDepth = 5 } = options || {};

  // Fetch top-level comments (no parent)
  const topLevelComments = await prisma.comment.findMany({
    where: {
      pollId,
      parentId: null,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
    orderBy: {
      createdAt: sort === "newest" ? "desc" : "asc",
    },
  });

  // Recursively fetch replies for each top-level comment
  const commentsWithReplies = await Promise.all(
    topLevelComments.map(async (comment) => {
      const replies = await getReplies(comment.id, maxDepth - 1);
      return { ...comment, replies };
    }),
  );

  return commentsWithReplies;
}

/**
 * Recursively fetch replies for a comment
 */
async function getReplies(
  parentId: string,
  remainingDepth: number,
): Promise<any[]> {
  if (remainingDepth <= 0) {
    return [];
  }

  const replies = await prisma.comment.findMany({
    where: { parentId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc", // Replies always oldest first
    },
  });

  // Recursively fetch nested replies
  const repliesWithNested = await Promise.all(
    replies.map(async (reply) => {
      const nestedReplies = await getReplies(reply.id, remainingDepth - 1);
      return { ...reply, replies: nestedReplies };
    }),
  );

  return repliesWithNested;
}

/**
 * Get a single comment by ID with author info
 */
export async function getCommentById(commentId: string) {
  return await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });
}

/**
 * Add a new comment or reply
 */
export async function addComment(data: {
  text: string;
  pollId: string;
  authorId: string;
  parentId?: string;
}) {
  // Validate parent exists if replying
  if (data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: data.parentId },
    });

    if (!parent) {
      throw new Error("Parent comment not found");
    }

    // Ensure parent belongs to same poll
    if (parent.pollId !== data.pollId) {
      throw new Error("Parent comment belongs to different poll");
    }
  }

  return await prisma.comment.create({
    data: {
      text: data.text,
      pollId: data.pollId,
      authorId: data.authorId,
      parentId: data.parentId || null,
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });
}

/**
 * Delete a comment and all its replies (cascade)
 * Authorization check should be done before calling this
 */
export async function deleteComment(commentId: string) {
  // Get comment to check if it exists
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      _count: {
        select: {
          replies: true,
        },
      },
    },
  });

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Delete comment (cascade will delete all replies)
  await prisma.comment.delete({
    where: { id: commentId },
  });

  return {
    deleted: true,
    repliesDeleted: comment._count.replies,
  };
}

/**
 * Get comment count for a poll
 */
export async function getCommentCount(pollId: string) {
  return await prisma.comment.count({
    where: { pollId },
  });
}

/**
 * Check if user can delete a comment
 * User can delete if they are the author or an admin
 */
export async function canDeleteComment(
  commentId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) {
    return false;
  }

  return comment.authorId === userId;
}
