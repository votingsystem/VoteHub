import { z } from "zod";

// ============================================================================
// Vote Validation
// ============================================================================

export const voteSubmissionSchema = z.object({
  pollId: z.string().cuid("Invalid poll ID"),
  optionId: z.string().cuid("Invalid option ID"),
});

export type VoteSubmissionInput = z.infer<typeof voteSubmissionSchema>;

// ============================================================================
// Poll Creation/Update Validation
// ============================================================================

export const pollCreationSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must not exceed 5000 characters"),

  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),

  tagId: z.string().cuid("Invalid tag ID"),

  startAt: z.coerce.date(),

  durationHours: z
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1 hour")
    .max(8760, "Duration cannot exceed 8760 hours (365 days)"),

  options: z
    .array(
      z.object({
        label: z
          .string()
          .min(1, "Option label is required")
          .max(100, "Option label must not exceed 100 characters"),
        order: z.number().int().min(0).max(4),
      }),
    )
    .min(2, "Poll must have at least 2 options")
    .max(5, "Poll cannot have more than 5 options")
    .refine(
      (options) => {
        // Check for duplicate labels
        const labels = options.map((o) => o.label.toLowerCase().trim());
        return new Set(labels).size === labels.length;
      },
      {
        message: "Option labels must be unique",
      },
    )
    .refine(
      (options) => {
        // Check for sequential ordering (0, 1, 2, ...)
        const orders = options.map((o) => o.order).sort((a, b) => a - b);
        return orders.every((order, index) => order === index);
      },
      {
        message: "Option order must be sequential starting from 0",
      },
    ),
});

export type PollCreationInput = z.infer<typeof pollCreationSchema>;

export const pollUpdateSchema = pollCreationSchema
  .partial()
  .omit({ options: true })
  .extend({
    id: z.string().cuid("Invalid poll ID"),
  });

export type PollUpdateInput = z.infer<typeof pollUpdateSchema>;

// ============================================================================
// Comment Validation
// ============================================================================

export const commentCreationSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must not exceed 2000 characters"),

  pollId: z.string().cuid("Invalid poll ID"),

  parentId: z.string().cuid("Invalid parent comment ID").optional(),
});

export type CommentCreationInput = z.infer<typeof commentCreationSchema>;

// ============================================================================
// Tag Validation
// ============================================================================

export const tagCreationSchema = z.object({
  name: z
    .string()
    .min(2, "Tag name must be at least 2 characters")
    .max(50, "Tag name must not exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9\s-]+$/,
      "Tag name can only contain letters, numbers, spaces, and hyphens",
    ),
});

export type TagCreationInput = z.infer<typeof tagCreationSchema>;

// Helper to generate slug from tag name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");
}

// ============================================================================
// Auth Validation
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),

  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must not exceed 20 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    ),

  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
