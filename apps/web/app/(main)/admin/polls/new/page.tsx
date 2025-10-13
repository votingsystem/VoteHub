import { getTags } from "@/services/tag-service";
import { PollForm } from "./poll-form";

export default async function NewPollPage() {
  const tags = await getTags();

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Create New Poll</h2>
      <PollForm tags={tags} />
    </div>
  );
}
