"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { updatePollAction } from "@/actions/poll-actions";
import { useRouter } from "next/navigation";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  link: string | null;
  tagId: string;
  startAt: Date;
  durationHours: number;
  options: Array<{
    id: string;
    label: string;
    order: number;
  }>;
  _count?: {
    votes: number;
    comments?: number;
  };
}

interface PollEditFormProps {
  poll: Poll;
  tags: Tag[];
}

export function PollEditForm({ poll, tags }: PollEditFormProps) {
  const router = useRouter();
  const [options, setOptions] = useState<string[]>(
    poll.options.map((opt) => opt.label),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasVotes = (poll._count?.votes || 0) > 0;

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    // Add options to form data
    options.forEach((option, index) => {
      formData.append(`option-${index}`, option);
    });

    try {
      const result = await updatePollAction(poll.id, formData);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        // Redirect to admin polls page on success
        router.push("/admin/polls");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  // Get current datetime in local timezone for min attribute
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  if (hasVotes) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            <p className="font-semibold mb-2">Cannot Edit Poll</p>
            <p>
              This poll has already received votes and cannot be edited. You can
              unpublish it from the admin polls page if needed.
            </p>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/admin/polls")}
            >
              Back to Polls
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Enter poll title"
              required
              minLength={5}
              maxLength={200}
              defaultValue={poll.title}
            />
            <p className="text-sm text-muted-foreground">5-200 characters</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Enter poll description"
              required
              minLength={10}
              maxLength={5000}
              rows={4}
              defaultValue={poll.description}
            />
            <p className="text-sm text-muted-foreground">10-5000 characters</p>
          </div>

          {/* Link (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="link">Link (optional)</Label>
            <Input
              id="link"
              name="link"
              type="url"
              placeholder="https://example.com"
              defaultValue={poll.link || ""}
            />
            <p className="text-sm text-muted-foreground">
              Optional external link related to this poll
            </p>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tagId">Tag *</Label>
            <Select name="tagId" required defaultValue={poll.tagId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date/Time */}
          <div className="space-y-2">
            <Label htmlFor="startAt">Start Date & Time *</Label>
            <Input
              id="startAt"
              name="startAt"
              type="datetime-local"
              required
              min={minDateTime}
              defaultValue={formatDateTimeLocal(poll.startAt)}
            />
            <p className="text-sm text-muted-foreground">
              When voting should begin
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="durationHours">Duration (hours) *</Label>
            <Input
              id="durationHours"
              name="durationHours"
              type="number"
              required
              min={1}
              max={8760}
              defaultValue={poll.durationHours}
            />
            <p className="text-sm text-muted-foreground">
              1-8760 hours (1 hour to 365 days)
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Voting Options * (2-5 options)</Label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    required
                    minLength={1}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeOption(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 5 && (
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                className="w-full"
              >
                + Add Option
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              Minimum 2, maximum 5 options
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Updating..." : "Update Poll"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/polls")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
