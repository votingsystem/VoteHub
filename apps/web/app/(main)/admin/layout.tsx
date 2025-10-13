import { getSession } from "@/actions/auth-actions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Check authentication
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check admin role
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <nav className="flex gap-4">
              <Link
                href="/admin/polls"
                className="text-sm font-medium hover:underline"
              >
                Polls
              </Link>
              <Link
                href="/admin/tags"
                className="text-sm font-medium hover:underline"
              >
                Tags
              </Link>
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:underline"
              >
                Back to Feed
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
