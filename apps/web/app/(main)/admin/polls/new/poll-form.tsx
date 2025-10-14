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
import { createPollAction } from "@/actions/poll-actions";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface PollFormProps {
  tags: Tag[];
}

export function PollForm({ tags }: PollFormProps) {
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const result = await createPollAction(formData);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      }
      // If successful, the action will redirect
    } catch {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  // Get current datetime in local timezone for min attribute
  const now = new Date();
  const minDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

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
            />
            <p className="text-sm text-muted-foreground">
              Optional external link related to this poll
            </p>
          </div>

          {/* Tag */}
          <div className="space-y-2">
            <Label htmlFor="tagId">Tag *</Label>
            <Select name="tagId" required>
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
              defaultValue={168}
            />
            <p className="text-sm text-muted-foreground">
              1-8760 hours (1 hour to 365 days). Default: 168 (1 week)
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
              {isSubmitting ? "Creating..." : "Create Poll"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
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
