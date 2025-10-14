import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - VoteHub",
  description: "Sign in or create an account to participate in VoteHub polls",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
