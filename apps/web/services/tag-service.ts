import { prisma } from "@/lib/prisma";

/**
 * Tag Service
 * Handles tag management operations for poll categorization
 */

/**
 * Get all tags, ordered by name
 */
export async function getTags() {
  return await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { polls: true },
      },
    },
  });
}

/**
 * Get a single tag by ID
 */
export async function getTagById(id: string) {
  return await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { polls: true },
      },
    },
  });
}

/**
 * Get a tag by slug
 */
export async function getTagBySlug(slug: string) {
  return await prisma.tag.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { polls: true },
      },
    },
  });
}

/**
 * Create a new tag
 * Auto-generates slug from name (lowercase, hyphenated)
 */
export async function createTag(data: { name: string; createdBy: string }) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Check if slug already exists
  const existing = await prisma.tag.findUnique({
    where: { slug },
  });

  if (existing) {
    throw new Error(`Tag with name "${data.name}" already exists`);
  }

  return await prisma.tag.create({
    data: {
      name: data.name,
      slug,
      createdBy: data.createdBy,
    },
  });
}

/**
 * Update a tag (name and slug)
 */
export async function updateTag(
  id: string,
  data: {
    name: string;
  },
) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Check if slug already exists (excluding current tag)
  const existing = await prisma.tag.findFirst({
    where: {
      slug,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error(`Tag with name "${data.name}" already exists`);
  }

  return await prisma.tag.update({
    where: { id },
    data: {
      name: data.name,
      slug,
    },
  });
}

/**
 * Delete a tag
 * Only allowed if no polls are using this tag
 */
export async function deleteTag(id: string) {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { polls: true },
      },
    },
  });

  if (!tag) {
    throw new Error("Tag not found");
  }

  if (tag._count.polls > 0) {
    throw new Error(
      `Cannot delete tag "${tag.name}": ${tag._count.polls} poll(s) are using this tag`,
    );
  }

  return await prisma.tag.delete({
    where: { id },
  });
}
