import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 text-fg">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="size-12 rounded-xl" />
        <div className="h-1 w-28 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-sm text-muted">A verificar a sessão…</p>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <AuthSplash />;
  if (user) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}
