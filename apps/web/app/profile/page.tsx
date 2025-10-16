import { getSession } from "@/actions/auth-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { redirect } from "next/navigation";
import Image from "next/image";

/**
 * Profile page - displays user information from Google OAuth
 * Phase 7: User Story 4 - Profile Management with Google Data (T037)
 */
export default async function ProfilePage() {
  const session = await getSession();

  // Redirect to sign-in if not authenticated
  if (!session?.user) {
    redirect("/sign-in");
  }

  const user = session.user as any;

  // Format last sync date if available
  const lastSyncDate = user.lastGoogleSync
    ? new Date(user.lastGoogleSync).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your profile information from Google
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          {user.googleProfilePicture && (
            <div className="flex items-center gap-4">
              <Image
                src={user.googleProfilePicture}
                alt={`${user.name || user.email}'s profile picture`}
                width={80}
                height={80}
                className="rounded-full"
                priority
              />
              <div className="text-sm text-muted-foreground">
                <p>Profile Picture</p>
                <p className="text-xs">Synced from Google</p>
              </div>
            </div>
          )}

          {/* Name (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Name
              <span className="ml-2 text-xs text-muted-foreground">
                (Read-only)
              </span>
            </label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {user.name || "Not provided"}
            </div>
            <p className="text-xs text-muted-foreground">
              Your name syncs automatically from your Google account and cannot
              be edited here.
            </p>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Email
              <span className="ml-2 text-xs text-muted-foreground">
                (Read-only)
              </span>
            </label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {user.email}
            </div>
            <p className="text-xs text-muted-foreground">
              Your email address from your Google account.
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {user.username}
            </div>
            <p className="text-xs text-muted-foreground">
              Your unique username on VoteHub.
            </p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <div className="rounded-md border bg-muted px-3 py-2 text-sm capitalize">
              {user.role.toLowerCase()}
            </div>
          </div>

          {/* Last Google Sync */}
          {user.googleId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Google Sync</label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {lastSyncDate}
              </div>
              <p className="text-xs text-muted-foreground">
                Your profile information is automatically updated from Google
                each time you sign in.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> Profile information (name, email, profile
              picture) is managed through your Google account. Any changes made
              in Google will be reflected here the next time you sign in.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
