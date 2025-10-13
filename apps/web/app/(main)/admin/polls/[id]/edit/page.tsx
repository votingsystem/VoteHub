import { getPollById } from "@/services/poll-service";
import { getTags } from "@/services/tag-service";
import { notFound } from "next/navigation";
import { PollEditForm } from "./poll-edit-form";

export default async function EditPollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [poll, tags] = await Promise.all([getPollById(id), getTags()]);

  if (!poll) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Edit Poll</h2>
      <PollEditForm poll={poll} tags={tags} />
    </div>
  );
}
