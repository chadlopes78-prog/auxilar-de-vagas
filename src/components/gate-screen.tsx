import { Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { WatchVideoHero } from "@/components/watch-video";

export function GateScreen() {
  const { user, isPending } = useCurrentUserState();
  const portalTo = !isPending && user ? "/dashboard" : "/login";

  return (
    <div className="gate-screen flex min-h-dvh flex-col">
      <header className="gate-topbar flex items-center justify-end px-4 py-5 sm:px-10 lg:px-14">
        <Link to={portalTo} className="gate-nav-link shrink-0 text-sm font-semibold">
          Acessar o portal
        </Link>
      </header>

      <main className="gate-main mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 pb-16 pt-4 sm:px-8">
        <div className="gate-stage mx-auto w-full max-w-[34rem] text-center">
          <p className="gate-kicker">PORTAL DE EMPREGO</p>
          <h1 className="gate-title">
            Assista ao vídeo agora para não falhar ao resgatar a vaga
          </h1>
          <div className="gate-actions">
            <WatchVideoHero />
            <Link to={portalTo} className="gate-portal-cta">
              Acessar o portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
