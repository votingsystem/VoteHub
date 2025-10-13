import { prisma } from "@/lib/prisma";
import type { PollWithRelations } from "@/types/poll";
import { PollStatus } from "@prisma/client";

/**
 * Get poll with computed status based on current time
 */
export async function getPollWithStatus(pollId: string) {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      author: {
        select: { id: true, username: true },
      },
      tag: {
        select: { id: true, name: true, slug: true },
      },
      options: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: {
          votes: true,
          comments: true,
        },
      },
    },
  });

  if (!poll) return null;

  // Compute status based on current time
  const now = new Date();
  let computedStatus: PollStatus = poll.status;

  if (now < poll.startAt) {
    computedStatus = PollStatus.SCHEDULED;
  } else if (now >= poll.startAt && now <= poll.endAt) {
    computedStatus = PollStatus.ACTIVE;
  } else {
    computedStatus = PollStatus.CLOSED;
  }

  return {
    ...poll,
    status: computedStatus,
  } as PollWithRelations;
}

/**
 * Get all active polls (between startAt and endAt)
 * Supports sorting: newest (default), most-voted, trending
 */
export async function getActivePolls(options?: {
  tagSlug?: string;
  limit?: number;
  offset?: number;
  sort?: "newest" | "most-voted" | "trending";
}) {
  const { tagSlug, limit = 20, offset = 0, sort = "newest" } = options || {};

  const now = new Date();

  const where = {
    startAt: { lte: now },
    endAt: { gte: now },
    status: { not: PollStatus.CLOSED as PollStatus },
    ...(tagSlug && {
      tag: {
        slug: tagSlug,
      },
    }),
  };

  const [polls, total] = await Promise.all([
    prisma.poll.findMany({
      where,
      include: {
        author: {
          select: { id: true, username: true },
        },
        tag: {
          select: { id: true, name: true, slug: true },
        },
        options: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
      // Sort by newest or most-voted (trending is client-side calculated)
      orderBy:
        sort === "most-voted"
          ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }]
          : { createdAt: "desc" },
      take: sort === "trending" ? undefined : limit,
      skip: sort === "trending" ? undefined : offset,
    }),
    prisma.poll.count({ where }),
  ]);

  let sortedPolls = polls as PollWithRelations[];

  // Apply trending algorithm if requested
  if (sort === "trending") {
    // Calculate trending score: votes / age_in_hours^1.5 (Reddit algorithm)
    const scored = sortedPolls.map((poll) => {
      const ageHours =
        (Date.now() - new Date(poll.createdAt).getTime()) / (1000 * 60 * 60);
      const voteCount = poll._count?.votes || 0;
      const score = voteCount / Math.pow(ageHours + 2, 1.5);
      return { ...poll, trendingScore: score };
    });

    sortedPolls = scored
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(offset, offset + limit);
  }

  return {
    polls: sortedPolls,
    total,
    hasMore: offset + sortedPolls.length < total,
  };
}

/**
 * Get poll by ID with all relations
 */
export async function getPollById(pollId: string) {
  return getPollWithStatus(pollId);
}

/**
 * Get all polls (for admin)
 */
export async function getAllPolls(options?: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 20, offset = 0 } = options || {};

  const [polls, total] = await Promise.all([
    prisma.poll.findMany({
      include: {
        author: {
          select: { id: true, username: true },
        },
        tag: {
          select: { id: true, name: true, slug: true },
        },
        options: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            votes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.poll.count(),
  ]);

  return {
    polls: polls as PollWithRelations[],
    total,
    hasMore: offset + polls.length < total,
  };
}

/**
 * Check if user has voted on a poll
 */
export async function hasUserVoted(pollId: string, userId: string) {
  const vote = await prisma.vote.findUnique({
    where: {
      userId_pollId: {
        userId,
        pollId,
      },
    },
  });

  return !!vote;
}

/**
 * Create a new poll (Admin only)
 */
export async function createPoll(data: {
  title: string;
  description: string;
  link?: string;
  tagId: string;
  startAt: Date;
  durationHours: number;
  authorId: string;
  options: { label: string; order: number }[];
}) {
  // Calculate endAt
  const endAt = new Date(
    data.startAt.getTime() + data.durationHours * 60 * 60 * 1000,
  );

  // Determine initial status
  const now = new Date();
  let status: PollStatus;
  if (now < data.startAt) {
    status = PollStatus.SCHEDULED;
  } else if (now >= data.startAt && now < endAt) {
    status = PollStatus.ACTIVE;
  } else {
    status = PollStatus.CLOSED;
  }

  return await prisma.poll.create({
    data: {
      title: data.title,
      description: data.description,
      link: data.link || null,
      tagId: data.tagId,
      startAt: data.startAt,
      durationHours: data.durationHours,
      endAt,
      status,
      authorId: data.authorId,
      options: {
        create: data.options,
      },
    },
    include: {
      author: {
        select: { id: true, username: true },
      },
      tag: {
        select: { id: true, name: true, slug: true },
      },
      options: {
        orderBy: { order: "asc" },
      },
    },
  });
}

/**
 * Update a poll (Admin only)
 * Only allowed if no votes have been cast
 */
export async function updatePoll(
  pollId: string,
  data: {
    title?: string;
    description?: string;
    link?: string;
    tagId?: string;
    startAt?: Date;
    durationHours?: number;
    options?: { id?: string; label: string; order: number }[];
  },
) {
  // Check if poll has votes
  const voteCount = await prisma.vote.count({
    where: { pollId },
  });

  if (voteCount > 0) {
    throw new Error(
      "Cannot update poll: voting has already started. You can unpublish the poll instead.",
    );
  }

  // If startAt or durationHours changed, recalculate endAt and status
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
  });

  if (!poll) {
    throw new Error("Poll not found");
  }

  const startAt = data.startAt || poll.startAt;
  const durationHours = data.durationHours || poll.durationHours;
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);

  // Determine status
  const now = new Date();
  let status: PollStatus;
  if (now < startAt) {
    status = PollStatus.SCHEDULED;
  } else if (now >= startAt && now < endAt) {
    status = PollStatus.ACTIVE;
  } else {
    status = PollStatus.CLOSED;
  }

  // Handle options update if provided
  const updateData: any = {
    ...(data.title && { title: data.title }),
    ...(data.description && { description: data.description }),
    ...(data.link !== undefined && { link: data.link || null }),
    ...(data.tagId && { tagId: data.tagId }),
    ...(data.startAt && { startAt: data.startAt }),
    ...(data.durationHours && { durationHours: data.durationHours }),
    endAt,
    status,
  };

  // If options are provided, delete old ones and create new ones
  if (data.options) {
    await prisma.votingOption.deleteMany({
      where: { pollId },
    });
    updateData.options = {
      create: data.options.map(({ label, order }) => ({ label, order })),
    };
  }

  return await prisma.poll.update({
    where: { id: pollId },
    data: updateData,
    include: {
      author: {
        select: { id: true, username: true },
      },
      tag: {
        select: { id: true, name: true, slug: true },
      },
      options: {
        orderBy: { order: "asc" },
      },
    },
  });
}

/**
 * Delete a poll (Admin only)
 * Only allowed if no votes have been cast
 */
export async function deletePoll(pollId: string) {
  // Check if poll has votes
  const voteCount = await prisma.vote.count({
    where: { pollId },
  });

  if (voteCount > 0) {
    throw new Error(
      "Cannot delete poll: votes have been cast. You can unpublish the poll instead.",
    );
  }

  return await prisma.poll.delete({
    where: { id: pollId },
  });
}

/**
 * Unpublish/close a poll (Admin only)
 * Sets status to CLOSED, making it hidden from public feed
 */
export async function unpublishPoll(pollId: string) {
  return await prisma.poll.update({
    where: { id: pollId },
    data: { status: PollStatus.CLOSED },
    include: {
      author: {
        select: { id: true, username: true },
      },
      tag: {
        select: { id: true, name: true, slug: true },
      },
      options: {
        orderBy: { order: "asc" },
      },
    },
  });
}
