"use server";

import { getSession } from "@/actions/auth-actions";
import { pollCreationSchema } from "@/lib/validations";
import {
  createPoll,
  updatePoll,
  deletePoll,
  unpublishPoll,
} from "@/services/poll-service";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
 * Create a new poll (Admin only)
 */
export async function createPollAction(formData: FormData) {
  try {
    // Check admin auth
    const session = await requireAdmin();

    // Parse form data
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const link = formData.get("link") as string;
    const tagId = formData.get("tagId") as string;
    const startAt = formData.get("startAt") as string;
    const durationHours = formData.get("durationHours") as string;

    // Parse options (dynamic array)
    const options: { label: string; order: number }[] = [];
    let i = 0;
    while (formData.has(`option-${i}`)) {
      const label = formData.get(`option-${i}`) as string;
      if (label && label.trim()) {
        options.push({ label: label.trim(), order: i });
      }
      i++;
    }

    // Validate with Zod
    const result = pollCreationSchema.safeParse({
      title,
      description,
      link: link || undefined,
      tagId,
      startAt: new Date(startAt),
      durationHours: parseInt(durationHours, 10),
      options,
    });

    if (!result.success) {
      return {
        error: result.error.errors[0]?.message || "Invalid poll data",
      };
    }

    // Create poll
    const poll = await createPoll({
      ...result.data,
      authorId: session.user.id,
      options: result.data.options.map((opt: any) => ({
        label: opt.label,
        order: opt.order,
      })),
    });

    // Revalidate polls
    revalidateTag("polls");
    revalidatePath("/");
    revalidatePath("/admin/polls");

    // Redirect to poll detail page
    redirect(`/poll/${poll.id}`);
  } catch (error) {
    console.error("Poll creation error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to create poll. Please try again." };
  }
}

/**
 * Update a poll (Admin only)
 * Only allowed if no votes have been cast
 */
export async function updatePollAction(pollId: string, formData: FormData) {
  try {
    // Check admin auth
    await requireAdmin();

    // Parse form data
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const link = formData.get("link") as string;
    const tagId = formData.get("tagId") as string;
    const startAt = formData.get("startAt") as string;
    const durationHours = formData.get("durationHours") as string;

    // Parse options (dynamic array)
    const options: { label: string; order: number }[] = [];
    let i = 0;
    while (formData.has(`option-${i}`)) {
      const label = formData.get(`option-${i}`) as string;
      if (label && label.trim()) {
        options.push({ label: label.trim(), order: i });
      }
      i++;
    }

    // Validate with Zod
    const result = pollCreationSchema.safeParse({
      title,
      description,
      link: link || undefined,
      tagId,
      startAt: new Date(startAt),
      durationHours: parseInt(durationHours, 10),
      options,
    });

    if (!result.success) {
      return {
        error: result.error.errors[0]?.message || "Invalid poll data",
      };
    }

    // Update poll
    const poll = await updatePoll(pollId, {
      ...result.data,
      options: result.data.options.map((opt: any) => ({
        label: opt.label,
        order: opt.order,
      })),
    });

    // Revalidate polls
    revalidateTag("polls");
    revalidatePath("/");
    revalidatePath(`/poll/${pollId}`);
    revalidatePath("/admin/polls");

    return { success: true, poll };
  } catch (error) {
    console.error("Poll update error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to update poll. Please try again." };
  }
}

/**
 * Delete a poll (Admin only)
 * Only allowed if no votes have been cast
 */
export async function deletePollAction(pollId: string) {
  try {
    // Check admin auth
    await requireAdmin();

    // Delete poll
    await deletePoll(pollId);

    // Revalidate polls
    revalidateTag("polls");
    revalidatePath("/");
    revalidatePath("/admin/polls");

    return { success: true };
  } catch (error) {
    console.error("Poll deletion error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to delete poll. Please try again." };
  }
}

/**
 * Unpublish/close a poll (Admin only)
 * Sets status to CLOSED, making it hidden from public feed
 */
export async function unpublishPollAction(pollId: string) {
  try {
    // Check admin auth
    await requireAdmin();

    // Unpublish poll
    const poll = await unpublishPoll(pollId);

    // Revalidate polls
    revalidateTag("polls");
    revalidatePath("/");
    revalidatePath(`/poll/${pollId}`);
    revalidatePath("/admin/polls");

    return { success: true, poll };
  } catch (error) {
    console.error("Poll unpublish error:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Failed to unpublish poll. Please try again." };
  }
}
