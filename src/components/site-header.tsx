import { Link } from "@tanstack/react-router";
import { Bell, Briefcase, MapPin, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedOut } from "@/lib/auth/gates";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { useLocationStore } from "@/store/location";
import { useGeo } from "@/hooks/use-geo";
import { countryFlag } from "@/lib/i18n";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { SupportHeaderButton, supportUrl } from "@/components/support-whatsapp";

function AuthSlot({ compact }: { compact?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-border" />;
  }
  if (user) {
    return (
      <>
        <Link
          to="/notifications"
          className="grid size-11 place-items-center rounded-[10px] border border-border"
          aria-label="Notificações"
        >
          <Bell className="size-4" />
        </Link>
        {compact ? null : (
          <>
            <Link to="/dashboard" className="hidden text-sm font-medium md:inline">
              {user.displayName?.split(" ")[0] ?? "Perfil"}
            </Link>
            <button type="button" className="hidden text-sm text-muted hover:text-fg md:inline" onClick={() => signOut()}>
              Sair
            </button>
          </>
        )}
      </>
    );
  }
  return (
    <SignedOut>
      <Link to="/login" className="hidden text-sm font-medium md:inline">
        Entrar
      </Link>
      <Link to="/register">
        <Button variant="outline" size="sm">
          Criar conta
        </Button>
      </Link>
    </SignedOut>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const { user } = useCurrentUserState();
  const loc = useLocationStore();
  const geo = useGeo();
  useEffect(() => setReady(true), []);
  const city = ready ? geo.cities.find((c) => c.id === loc.cityId)?.name : undefined;
  const region = ready ? geo.regions.find((r) => r.id === loc.regionId)?.name : undefined;
  const country = ready ? geo.countries.find((c) => c.id === loc.countryId) : undefined;
  const placeLabel = city ?? region ?? country?.name;

  const nav = [
    { to: "/dashboard", label: "Início" },
    { to: "/vagas", label: "Vagas" },
    { to: "/companies", label: "Empresas" },
    { to: "/categories", label: "Categorias" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
          <BrandMark className="size-8" />
          <span className="truncate text-sm sm:text-base">{APP_NAME}</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-lg px-3 py-2 text-sm text-fg/80 hover:bg-bg"
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/applications" className="rounded-lg px-3 py-2 text-sm text-fg/80 hover:bg-bg">
                Minhas candidaturas
              </Link>
              <Link to="/saved" className="rounded-lg px-3 py-2 text-sm text-fg/80 hover:bg-bg">
                Vagas guardadas
              </Link>
            </>
          ) : null}
        </nav>
        <button
          type="button"
          onClick={() => loc.setLocation({ confirmed: false })}
          className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted hover:bg-bg md:inline-flex"
        >
          <MapPin className="size-3.5" />
          {placeLabel ? `${countryFlag(country?.code)} ${placeLabel}` : "Localização"}
        </button>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span className="hidden sm:inline-flex">
            <SupportHeaderButton />
          </span>
          {user ? (
            <Link to="/dashboard" className="hidden md:inline">
              <Button size="sm" variant="outline">
                Painel
              </Button>
            </Link>
          ) : null}
          <AuthSlot />
          <button
            type="button"
            className="grid size-11 place-items-center rounded-[10px] border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/applications" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Minhas candidaturas
              </Link>
              <Link to="/saved" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Vagas guardadas
              </Link>
              <Link to="/dashboard" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Painel
              </Link>
              <button type="button" className="block min-h-11 py-3 text-base" onClick={() => signOut()}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Entrar
              </Link>
              <Link to="/register" className="block min-h-11 py-3 text-base" onClick={() => setOpen(false)}>
                Criar conta
              </Link>
            </>
          )}
          <a
            href={supportUrl()}
            target="_blank"
            rel="noreferrer"
            className="block min-h-11 py-3 text-base"
            onClick={() => setOpen(false)}
          >
            Suporte
          </a>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} {APP_NAME}. Pesquisa de emprego em Moçambique, Angola e Portugal.</span>
        <span className="inline-flex flex-wrap items-center gap-3">
          <Link to="/vagas/$country" params={{ country: "mocambique" }} search={{}} className="hover:text-fg">
            Moçambique
          </Link>
          <Link to="/vagas/$country" params={{ country: "angola" }} search={{}} className="hover:text-fg">
            Angola
          </Link>
          <Link to="/vagas/$country" params={{ country: "portugal" }} search={{}} className="hover:text-fg">
            Portugal
          </Link>
          <span className="inline-flex items-center gap-1">
            <Briefcase className="size-4" />
            Fontes autorizadas
          </span>
        </span>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-bg text-fg">
      <SiteHeader />
      <div className="flex-1 pb-24 md:pb-0">{children}</div>
      <SiteFooter />
    </div>
  );
}
