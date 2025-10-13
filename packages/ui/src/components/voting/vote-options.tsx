"use client";

import { Button } from "../button";
import { Label } from "../label";
import { useState, useTransition } from "react";

interface VotingOption {
  id: string;
  label: string;
  order: number;
}

interface VoteOptionsProps {
  pollId: string;
  options: VotingOption[];
  onSubmit: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean }>;
}

export function VoteOptions({ pollId, options, onSubmit }: VoteOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!selectedOption) {
      setError("Please select an option");
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await onSubmit(formData);

      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="pollId" value={pollId} />

      <div className="space-y-3">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
            onClick={() => setSelectedOption(option.id)}
          >
            <input
              type="radio"
              id={option.id}
              name="optionId"
              value={option.id}
              checked={selectedOption === option.id}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="h-4 w-4 cursor-pointer"
              disabled={isPending}
            />
            <Label
              htmlFor={option.id}
              className="flex-1 cursor-pointer font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !selectedOption}
      >
        {isPending ? "Submitting..." : "Submit Vote"}
      </Button>
    </form>
  );
}
