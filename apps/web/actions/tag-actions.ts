"use server";

import { getSession } from "@/actions/auth-actions";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "@/services/tag-service";
import { revalidatePath } from "next/cache";

/**
 * Helper to check if user is admin
 */
async function requireAdmin() {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("You must be logged in");
  }

  if (session.user.role !== "ADMIN") {
    throw new Error("Admin access required");
  }

  return session;
}

/**
 * Get all tags (Public)
 */
export async function getTagsAction() {
  try {
    const tags = await getTags();
    return { success: true, tags };
  } catch (error) {
    console.error("Get tags error:", error);
    return { error: "Failed to fetch tags" };
  }
}

/**
 * Create a new tag (Admin only)
 */
export async function createTagAction(formData: FormData) {
  try {
    // Check admin auth
    const session = await requireAdmin();

    const name = formData.get("name") as string;

    if (!name || name.trim().length < 2) {
      return { error: "Tag name must be at least 2 characters" };
    }

    if (name.length > 50) {
      return { error: "Tag name must be less than 50 characters" };
    }

    // Create tag
    const tag = await createTag({
      name: name.trim(),
      createdBy: session.user.id,
    });

    // Revalidate tag pages
    revalidatePath("/admin/tags");
    revalidatePath("/admin/polls/new");

    return { success: true, tag };
  } catch (error) {
    console.error("Tag creation error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create tag. Please try again." };
  }
}

/**
 * Update a tag (Admin only)
 */
export async function updateTagAction(tagId: string, formData: FormData) {
  try {
    // Check admin auth
    await requireAdmin();

    const name = formData.get("name") as string;

    if (!name || name.trim().length < 2) {
      return { error: "Tag name must be at least 2 characters" };
    }

    if (name.length > 50) {
      return { error: "Tag name must be less than 50 characters" };
    }

    // Update tag
    const tag = await updateTag(tagId, {
      name: name.trim(),
    });

    // Revalidate tag pages
    revalidatePath("/admin/tags");

    return { success: true, tag };
  } catch (error) {
    console.error("Tag update error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update tag. Please try again." };
  }
}

/**
 * Delete a tag (Admin only)
 * Only allowed if no polls are using this tag
 */
export async function deleteTagAction(tagId: string) {
  try {
    // Check admin auth
    await requireAdmin();

    // Delete tag
    await deleteTag(tagId);

    // Revalidate tag pages
    revalidatePath("/admin/tags");

    return { success: true };
  } catch (error) {
    console.error("Tag deletion error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete tag. Please try again." };
  }
}
