import { prisma } from "@/lib/prisma";
import type { VoteResults, VoteSubmissionInput } from "@/types/vote";

/**
 * Submit a vote for a poll
 * Enforces unique constraint: one vote per user per poll
 */
export async function submitVote(input: VoteSubmissionInput, userId: string) {
  const { pollId, optionId } = input;

  // Verify poll exists and is active
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
    },
  });

  if (!poll) {
    throw new Error("Poll not found");
  }

  const now = new Date();
  if (now < poll.startAt) {
    throw new Error("Poll has not started yet");
  }

  if (now > poll.endAt) {
    throw new Error("Poll has ended");
  }

  // Verify option belongs to this poll
  const option = await prisma.votingOption.findUnique({
    where: { id: optionId },
    select: { pollId: true },
  });

  if (!option || option.pollId !== pollId) {
    throw new Error("Invalid voting option");
  }

  // Check if user already voted (unique constraint will also prevent this)
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_pollId: {
        userId,
        pollId,
      },
    },
  });

  if (existingVote) {
    throw new Error("You have already voted on this poll");
  }

  // Create vote
  const vote = await prisma.vote.create({
    data: {
      userId,
      pollId,
      optionId,
    },
    include: {
      option: true,
    },
  });

  return vote;
}

/**
 * Get vote results for a poll
 * Returns aggregated vote counts and percentages
 */
export async function getVoteResults(pollId: string): Promise<VoteResults> {
  // Get all options for the poll
  const options = await prisma.votingOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
  });

  // Get vote counts for each option
  const voteCounts = await prisma.vote.groupBy({
    by: ["optionId"],
    where: { pollId },
    _count: {
      id: true,
    },
  });

  // Create a map of optionId -> vote count
  const voteCountMap = new Map(
    voteCounts.map((vc) => [vc.optionId, vc._count.id]),
  );

  // Calculate total votes
  const totalVotes = voteCounts.reduce((sum, vc) => sum + vc._count.id, 0);

  // Build results with percentages
  const results = options.map((option) => {
    const voteCount = voteCountMap.get(option.id) || 0;
    const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

    return {
      option,
      voteCount,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    };
  });

  return {
    pollId,
    totalVotes,
    options: results,
  };
}

/**
 * Get user's vote on a specific poll
 */
export async function getUserVote(pollId: string, userId: string) {
  const vote = await prisma.vote.findUnique({
    where: {
      userId_pollId: {
        userId,
        pollId,
      },
    },
    select: {
      pollId: true,
      optionId: true,
      createdAt: true,
    },
  });

  return vote;
}

/**
 * Get user's voting history
 */
export async function getUserVotes(
  userId: string,
  options?: { limit?: number; offset?: number },
) {
  const { limit = 20, offset = 0 } = options || {};

  const votes = await prisma.vote.findMany({
    where: { userId },
    include: {
      poll: {
        include: {
          tag: true,
          author: {
            select: { id: true, username: true },
          },
        },
      },
      option: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return votes;
}
