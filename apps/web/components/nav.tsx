import { getSession, logoutAction } from "@/actions/auth-actions";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

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
              <Link
                href={`/user/${session.user.username}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label={`View profile for ${session.user.username}`}
              >
                {session.user.username}
              </Link>

              {session.user.role === "ADMIN" && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/polls" aria-label="Admin dashboard">
                    Admin
                  </Link>
                </Button>
              )}

              <form action={logoutAction as unknown as () => void}>
                <Button type="submit" variant="ghost" size="sm">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Login</Link>
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
