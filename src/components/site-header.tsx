import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, X } from "lucide-react";
import { useState } from "react";
import { SignedOut } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { supportUrl } from "@/components/support-whatsapp";
import { MobileTabs } from "@/components/dash-nav";
import { WatchVideoHeader, WatchVideoMenuItem } from "@/components/watch-video";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUserState();

  const nav = user
    ? ([
        { to: "/dashboard", label: "Início" },
        { to: "/vagas", label: "Vagas" },
        { to: "/applications", label: "Candidaturas" },
        { to: "/cv", label: "Perfil" },
      ] as const)
    : ([
        { to: "/login", label: "Entrar" },
        { to: "/register", label: "Criar conta" },
      ] as const);

  const more = user
    ? ([
        { to: "/saved", label: "Guardadas" },
        { to: "/alerts", label: "Alertas" },
        { to: "/settings", label: "Definições" },
      ] as const)
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:h-16 sm:gap-3">
        <Link to={user ? "/dashboard" : "/"} className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
          <BrandMark className="size-7 shrink-0" decorative />
          <span className={`truncate font-bold text-base ${user ? "hidden md:inline" : ""}`}>{APP_NAME}</span>
        </Link>
        {user ? (
          <div className="shrink-0 md:hidden">
            <WatchVideoHeader compact />
          </div>
        ) : null}
        <nav className="ml-auto hidden items-center gap-4 md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="text-sm text-muted hover:text-fg">
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <WatchVideoHeader />
              <Link to="/notifications" aria-label="Notificações" className="text-muted hover:text-fg">
                <Bell className="size-4" />
              </Link>
              <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => signOut()}>
                Sair
              </button>
            </>
          ) : (
            <Link to="/login">
              <Button size="sm">Acessar o portal</Button>
            </Link>
          )}
        </nav>
        <button
          type="button"
          className={`grid size-11 shrink-0 place-items-center rounded-full border border-border md:hidden ${user ? "" : "ml-auto"}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-2 md:hidden">
          {(user ? more : nav).map((n) => (
            <Link key={n.to} to={n.to} className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <WatchVideoMenuItem onClick={() => setOpen(false)} />
              <Link to="/notifications" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Notificações
              </Link>
              <button type="button" className="block min-h-11 py-3 text-base" onClick={() => signOut()}>
                Sair
              </button>
            </>
          ) : (
            <SignedOut>
              <Link to="/login" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Acessar o portal
              </Link>
            </SignedOut>
          )}
          <a href={supportUrl()} target="_blank" rel="noreferrer" className="block min-h-11 py-3 text-base">
            Suporte
          </a>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border pb-20 md:pb-0">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        <span>Moçambique · Angola · Portugal</span>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useCurrentUserState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showTabs =
    Boolean(user) && !pathname.startsWith("/admin") && !pathname.startsWith("/employer");
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-fg">
      <SiteHeader />
      <div className="flex-1 pb-24 md:pb-0">{children}</div>
      <SiteFooter />
      {showTabs ? <MobileTabs active={pathname} /> : null}
    </div>
  );
}
