import type { Poll, VotingOption, Tag, User } from "@prisma/client";

export type { Poll, VotingOption };

export enum PollStatus {
  SCHEDULED = "SCHEDULED",
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
}

// Poll with relations for display
export type PollWithRelations = Poll & {
  author: Pick<User, "id" | "username">;
  tag: Pick<Tag, "id" | "name" | "slug">;
  options: VotingOption[];
  _count?: {
    votes: number;
    comments: number;
  };
};

// Poll creation input
export type CreatePollInput = {
  title: string;
  description: string;
  link?: string;
  tagId: string;
  startAt: Date;
  durationHours: number;
  options: Array<{ label: string; order: number }>;
};

// Poll update input
export type UpdatePollInput = Partial<Omit<CreatePollInput, "options">> & {
  id: string;
};
