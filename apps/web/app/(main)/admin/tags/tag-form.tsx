"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { createTagAction } from "@/actions/tag-actions";
import { useRouter } from "next/navigation";

export function TagForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createTagAction(formData);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        // Clear form and refresh page on success
        e.currentTarget.reset();
        setIsSubmitting(false);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Tag Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g., Politics, Technology, Science"
          required
          minLength={2}
          maxLength={50}
          pattern="[a-zA-Z0-9\s-]+"
        />
        <p className="text-sm text-muted-foreground">
          2-50 characters. Only letters, numbers, spaces, and hyphens allowed.
          Slug will be auto-generated.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Tag"}
      </Button>
    </form>
  );
}
