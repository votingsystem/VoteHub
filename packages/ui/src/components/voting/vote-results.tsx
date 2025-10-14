import { Badge } from "../badge";
import type { VoteResults as VoteResultsType } from "@/types/vote";

interface VoteResultsProps {
  results: VoteResultsType;
  userVotedOptionId?: string | null;
}

export function VoteResults({ results, userVotedOptionId }: VoteResultsProps) {
  const { totalVotes, options } = results;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Results</h3>
        <Badge variant="secondary">{totalVotes} votes</Badge>
      </div>

      <div className="space-y-3">
        {options.map((result) => {
          const isUserChoice = userVotedOptionId === result.option.id;

          return (
            <div key={result.option.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`font-medium ${isUserChoice ? "text-primary" : ""}`}
                >
                  {result.option.label}
                  {isUserChoice && " ✓"}
                </span>
                <span className="text-muted-foreground">
                  {result.voteCount} votes ({result.percentage}%)
                </span>
              </div>

              <div
                className="relative h-8 bg-secondary rounded-md overflow-hidden"
                role="progressbar"
                aria-valuenow={result.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${result.option.label}: ${result.percentage}% of votes`}
              >
                <div
                  className={`absolute inset-y-0 left-0 ${
                    isUserChoice ? "bg-primary" : "bg-primary/70"
                  } transition-all duration-500 ease-out flex items-center justify-end px-2`}
                  style={{ width: `${result.percentage}%` }}
                >
                  {result.percentage > 5 && (
                    <span className="text-xs font-medium text-primary-foreground">
                      {result.percentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalVotes === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No votes yet. Be the first to vote!
        </p>
      )}
    </div>
  );
}
