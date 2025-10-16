import { getSession, signOutAction } from "@/actions/auth-actions";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import Image from "next/image";

export async function Nav() {
  const session = await getSession();

  return (
    <nav className="border-b" aria-label="Main navigation">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold" aria-label="VoteHub home">
          VoteHub
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              {/* Profile link with avatar (T039) */}
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="View your profile"
              >
                {(session.user as any).googleProfilePicture ? (
                  <Image
                    src={(session.user as any).googleProfilePicture}
                    alt={`${session.user.name || session.user.email}'s profile picture`}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {session.user.name?.[0]?.toUpperCase() ||
                      session.user.email?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <span>{session.user.username}</span>
              </Link>

              {session.user.role === "ADMIN" && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/polls" aria-label="Admin dashboard">
                    Admin
                  </Link>
                </Button>
              )}

              <form action={signOutAction as unknown as () => void}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>

              <Button asChild size="sm">
                <Link href="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
