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
  Users,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import type { Profile } from "@/lib/types";
import { ROLE_PT } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import { SupportNavLink } from "@/components/support-whatsapp";

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
    ["/dashboard", "Visão geral"],
    ["/vagas", "Procurar vagas"],
    ["/saved", "Vagas guardadas"],
    ["/applications", "Candidaturas"],
    ["/cv", "O meu CV"],
    ["/alerts", "Alertas de vagas"],
    ["/settings", "Definições"],
  ] as const;
}

export function DashNav({ profile, active }: { profile: Profile | null; active: string }) {
  const role = profile?.role ?? "candidate";
  const items = navItems(role);
  const name = profile?.fullName?.trim() || "A sua conta";
  const roleLabel = ROLE_PT[role] ?? role;

  return (
    <nav className="dash-card overflow-hidden p-2 md:p-3">
      <div className="mb-2 hidden items-center gap-3 rounded-xl bg-bg px-3 py-3 md:flex">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-fg">
          {initials(name) || "AV"}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name.split(" ")[0]}</div>
          <div className="truncate text-xs text-muted">{roleLabel}</div>
        </div>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:block md:overflow-visible md:px-0">
        {items.map(([to, label]) => {
          const Icon = ICONS[to] ?? LayoutGrid;
          const on = active === to;
          return (
            <Link
              key={to}
              to={to}
              className={`dash-nav-link shrink-0 md:w-full ${
                on ? "bg-primary-soft font-medium text-primary" : "text-fg/80 hover:bg-bg"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
        <SupportNavLink />
        <button
          type="button"
          className="dash-nav-link mt-0 hidden w-full text-left text-muted hover:bg-bg hover:text-fg md:flex"
          onClick={() => signOut()}
        >
          <LogOut className="size-4" />
          Sair
        </button>
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
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-[240px_1fr] md:gap-6 md:py-8">
      <aside className="md:sticky md:top-20 md:self-start">
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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
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
    <div className="dash-card px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  value,
  label,
  icon: Icon,
  to,
}: {
  value: number | string;
  label: string;
  icon: typeof LayoutGrid;
  to?: string;
}) {
  const body = (
    <div className="dash-card flex min-h-[92px] items-center gap-3 p-4 transition-transform duration-150 hover:-translate-y-0.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

