"use client";

import { Button } from "../button";

interface SignOutButtonProps {
  onSignOut: () => Promise<void>;
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SignOutButton({
  onSignOut,
  variant = "ghost",
  size = "default",
  className,
}: SignOutButtonProps) {
  const handleSignOut = async () => {
    try {
      await onSignOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      variant={variant}
      size={size}
      className={className}
    >
      Sign out
    </Button>
  );
}
