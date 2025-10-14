import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

export default function PollNotFound() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Poll Not Found</CardTitle>
          <CardDescription>
            The poll you're looking for doesn't exist or has been removed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This poll may have been deleted by an admin or the link is
            incorrect. Please check the URL and try again.
          </p>

          <Button asChild>
            <Link href="/">Browse Active Polls</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
