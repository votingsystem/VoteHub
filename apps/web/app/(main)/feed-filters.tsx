"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useRouter, useSearchParams } from "next/navigation";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface FeedFiltersProps {
  tags: Tag[];
  currentSort: string;
  currentTag?: string;
}

export function FeedFilters({
  tags,
  currentSort,
  currentTag,
}: FeedFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/?${params.toString()}`);
  };

  const handleTagChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("tag");
    } else {
      params.set("tag", value);
    }
    router.push(`/?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push("/");
  };

  const hasActiveFilters = currentSort !== "newest" || currentTag;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm font-medium">
          Sort by:
        </label>
        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger id="sort" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="most-voted">Most Voted</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="tag" className="text-sm font-medium">
          Filter by tag:
        </label>
        <Select value={currentTag || "all"} onValueChange={handleTagChange}>
          <SelectTrigger id="tag" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.slug}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
