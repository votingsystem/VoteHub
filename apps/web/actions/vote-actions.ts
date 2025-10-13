"use server";

import { getSession } from "@/actions/auth-actions";
import { voteSubmissionSchema } from "@/lib/validations";
import {
  submitVote,
  getVoteResults,
  getUserVote,
} from "@/services/vote-service";
import { revalidatePath } from "next/cache";

/**
 * Submit a vote on a poll
 * Validates input, checks authentication, and revalidates the poll page
 */
export async function submitVoteAction(formData: FormData) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user?.id) {
      return { error: "You must be logged in to vote" };
    }

    // Parse and validate input
    const pollId = formData.get("pollId") as string;
    const optionId = formData.get("optionId") as string;

    const result = voteSubmissionSchema.safeParse({ pollId, optionId });

    if (!result.success) {
      return { error: result.error.errors[0]?.message || "Invalid vote data" };
    }

    // Submit vote
    const vote = await submitVote(result.data, session.user.id);

    // Revalidate the poll detail page and feed
    revalidatePath(`/poll/${pollId}`);
    revalidatePath("/");

    return { success: true, vote };
  } catch (error) {
    console.error("Vote submission error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to submit vote. Please try again." };
  }
}

/**
 * Get vote results for a poll (public)
 */
export async function getVoteResultsAction(pollId: string) {
  try {
    const results = await getVoteResults(pollId);
    return { success: true, results };
  } catch (error) {
    console.error("Get vote results error:", error);
    return { error: "Failed to fetch vote results" };
  }
}

/**
 * Get current user's vote on a poll
 */
export async function getUserVoteAction(pollId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: true, vote: null };
    }

    const vote = await getUserVote(pollId, session.user.id);
    return { success: true, vote };
  } catch (error) {
    console.error("Get user vote error:", error);
    return { error: "Failed to fetch user vote" };
  }
}
