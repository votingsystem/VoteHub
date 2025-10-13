"use server";

import { getSession } from "@/actions/auth-actions";
import { commentCreationSchema } from "@/lib/validations";
import {
  addComment,
  deleteComment,
  canDeleteComment,
} from "@/services/comment-service";
import { revalidatePath } from "next/cache";

/**
 * Add a new comment or reply to a poll
 */
export async function addCommentAction(formData: FormData) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: "You must be logged in to comment" };
    }

    // Parse and validate input
    const text = formData.get("text") as string;
    const pollId = formData.get("pollId") as string;
    const parentId = formData.get("parentId") as string | undefined;

    const result = commentCreationSchema.safeParse({
      text,
      pollId,
      parentId: parentId || undefined,
    });

    if (!result.success) {
      return {
        error: result.error.errors[0]?.message || "Invalid comment data",
      };
    }

    // Add comment
    const comment = await addComment({
      text: result.data.text,
      pollId: result.data.pollId,
      authorId: session.user.id,
      parentId: result.data.parentId,
    });

    // Revalidate the poll detail page
    revalidatePath(`/poll/${pollId}`);

    return { success: true, comment };
  } catch (error) {
    console.error("Comment creation error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to add comment. Please try again." };
  }
}

/**
 * Delete a comment (only author or admin)
 * Cascades to all replies
 */
export async function deleteCommentAction(commentId: string, pollId: string) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: "You must be logged in to delete comments" };
    }

    // Check authorization
    const canDelete = await canDeleteComment(
      commentId,
      session.user.id,
      session.user.role || "VOTER",
    );

    if (!canDelete) {
      return {
        error:
          "You can only delete your own comments (or all comments as admin)",
      };
    }

    // Delete comment
    const result = await deleteComment(commentId);

    // Revalidate the poll detail page
    revalidatePath(`/poll/${pollId}`);

    return { success: true, ...result };
  } catch (error) {
    console.error("Comment deletion error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete comment. Please try again." };
  }
}
