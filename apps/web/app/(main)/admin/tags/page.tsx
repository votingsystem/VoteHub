import { getTags } from "@/services/tag-service";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card";
import { TagForm } from "./tag-form";
import { deleteTagAction } from "@/actions/tag-actions";

export default async function AdminTagsPage() {
  const tags = await getTags();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-4">Manage Tags</h2>
        <p className="text-muted-foreground">
          Tags are used to categorize polls. Create and manage tags here.
        </p>
      </div>

      {/* Create New Tag Form */}
      <Card>
        <CardHeader>
          <h3 className="text-xl font-semibold">Create New Tag</h3>
        </CardHeader>
        <CardContent>
          <TagForm />
        </CardContent>
      </Card>

      {/* Existing Tags */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Existing Tags</h3>
        {tags.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No tags yet. Create your first tag above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <Card key={tag.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{tag.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Slug: {tag.slug}
                      </p>
                      <Badge variant="secondary" className="mt-2">
                        {tag._count.polls} poll
                        {tag._count.polls !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {tag._count.polls === 0 && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteTagAction(tag.id);
                        }}
                      >
                        <Button variant="outline" size="sm" type="submit">
                          Delete
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
