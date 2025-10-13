import type { Vote, VotingOption } from "@prisma/client";

export type { Vote };

// Vote submission input
export type VoteSubmissionInput = {
  pollId: string;
  optionId: string;
};

// Vote result for a single option
export type VoteOptionResult = {
  option: VotingOption;
  voteCount: number;
  percentage: number;
};

// Aggregated vote results for a poll
export type VoteResults = {
  pollId: string;
  totalVotes: number;
  options: VoteOptionResult[];
};

// User's vote on a specific poll
export type UserVote = {
  pollId: string;
  optionId: string;
  createdAt: Date;
};
