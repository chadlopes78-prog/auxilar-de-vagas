import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  LayoutGrid,
  LogOut,
  MapPin,
  Search,
  Settings,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import type { Profile } from "@/lib/types";
import { ROLE_PT } from "@/lib/i18n";

const ICONS: Record<string, typeof LayoutGrid> = {
  "/admin": LayoutGrid,
  "/admin/users": Users,
  "/admin/jobs": Briefcase,
  "/admin/companies": Building2,
  "/admin/locations": MapPin,
  "/admin/sources": Shield,
  "/employer": LayoutGrid,
  "/employer/jobs": Briefcase,
  "/employer/applications": FileText,
  "/employer/company": Building2,
  "/settings": Settings,
  "/dashboard": LayoutGrid,
  "/vagas": Search,
  "/saved": Bookmark,
  "/applications": FileText,
  "/cv": FileText,
  "/alerts": Bell,
};

function navItems(role: string) {
  if (role === "admin") {
    return [
      ["/admin", "Visão geral"],
      ["/admin/users", "Utilizadores"],
      ["/admin/jobs", "Vagas"],
      ["/admin/companies", "Empresas"],
      ["/admin/locations", "Localizações"],
      ["/admin/sources", "Fontes de vagas"],
    ] as const;
  }
  if (role === "employer") {
    return [
      ["/employer", "Visão geral"],
      ["/employer/jobs", "As minhas vagas"],
      ["/employer/applications", "Candidaturas"],
      ["/employer/company", "Perfil da empresa"],
      ["/settings", "Definições"],
    ] as const;
  }
  return [
    ["/dashboard", "Início"],
    ["/vagas", "Vagas"],
    ["/saved", "Guardadas"],
    ["/applications", "Candidaturas"],
    ["/cv", "Perfil"],
    ["/alerts", "Alertas"],
    ["/settings", "Definições"],
  ] as const;
}

export function DashNav({ profile, active }: { profile: Profile | null; active: string }) {
  const role = profile?.role ?? "candidate";
  const items = navItems(role);
  const name = profile?.fullName?.trim() || "A sua conta";
  const roleLabel = ROLE_PT[role] ?? role;

  return (
    <nav className="hidden md:block">
      <p className="mb-5 font-display text-xl font-bold leading-tight">{name.split(" ")[0]}</p>
      <p className="mb-6 text-xs uppercase tracking-[0.16em] text-muted">{roleLabel}</p>
      <div className="space-y-0.5">
        {items.map(([to, label]) => {
          const Icon = ICONS[to] ?? LayoutGrid;
          const on = active === to;
          return (
            <Link
              key={to}
              to={to}
              className={`dash-nav-link ${on ? "bg-primary-soft text-primary" : "text-muted hover:text-fg"}`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className="dash-nav-link w-full text-left text-muted hover:text-fg"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </nav>
  );
}

const MOBILE_TABS = [
  ["/dashboard", "Início", LayoutGrid],
  ["/vagas", "Vagas", Search],
  ["/applications", "Candidaturas", FileText],
  ["/cv", "Perfil", UserRound],
] as const;

export function MobileTabs({ active }: { active: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden">
      <div className="grid grid-cols-4">
        {MOBILE_TABS.map(([to, label, Icon]) => {
          const on =
            active === to ||
            (to === "/vagas" && (active.startsWith("/vagas") || active.startsWith("/jobs"))) ||
            (to === "/cv" && active.startsWith("/cv"));
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                on ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashShell({
  children,
  profile,
  active,
}: {
  children: React.ReactNode;
  profile: Profile | null;
  active: string;
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 md:grid-cols-[200px_1fr] md:py-10">
      <aside className="md:sticky md:top-24 md:self-start">
        <DashNav profile={profile} active={active} />
      </aside>
      <div className="dash-page min-w-0">{children}</div>
    </div>
  );
}

export function DashPage({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function EmptyPanel({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-t border-border py-12">
      <p className="font-display text-xl font-bold">{title}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  value,
  label,
  icon: _Icon,
  to,
}: {
  value: number | string;
  label: string;
  icon: typeof LayoutGrid;
  to?: string;
}) {
  const body = (
    <div>
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
