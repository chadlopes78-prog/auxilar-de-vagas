import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSplash() {
  return (
    <div className="auth-stage grid min-h-dvh place-items-center px-4">
      <div className="auth-glow" aria-hidden />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <BrandMark className="size-12 rounded-xl" />
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-primary-soft/20">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-sm text-auth-muted">A verificar a sessão…</p>
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
