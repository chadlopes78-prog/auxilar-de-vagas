import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { APP_NAME } from "@/lib/brand";
import { isVideoConfigured, VIDEO_URL } from "@/lib/video";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { toast } from "sonner";

export function GateScreen() {
  const { user, isPending } = useCurrentUserState();
  const portalTo = !isPending && user ? "/dashboard" : "/login";

  function openVideo() {
    if (!isVideoConfigured()) {
      toast.message("O vídeo ainda não está configurado. Coloque o link em VIDEO_URL.");
      return;
    }
    window.open(VIDEO_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="auth-stage flex min-h-dvh flex-col items-center justify-start px-4 py-8 sm:justify-center sm:py-12">
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <span className="auth-dot" />
      <div className="auth-glow" aria-hidden />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="auth-enter mb-8 flex items-center gap-2">
          <BrandMark className="size-10 rounded-xl" decorative />
          <span className="text-base font-semibold tracking-tight text-auth-fg">{APP_NAME}</span>
        </div>

        <p className="auth-enter auth-enter-2 text-xs font-medium uppercase tracking-[0.18em] text-auth-muted">
          Portal oficial
        </p>
        <h1 className="auth-enter auth-enter-2 mt-3 text-[1.85rem] leading-tight text-auth-fg sm:text-4xl">
          Assista ao vídeo agora para não falhar ao resgatar a vaga
        </h1>
        <p className="auth-enter auth-enter-3 mt-4 text-base leading-relaxed text-auth-muted">
          O vídeo explica como usar o portal e resgatar as vagas correctamente. Veja primeiro para
          não perder a oportunidade.
        </p>

        <div className="auth-enter auth-enter-4 mt-8 space-y-3">
          <button
            type="button"
            onClick={openVideo}
            className="video-cta flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-surface px-5 text-base font-semibold text-fg"
          >
            <Play className="size-5 fill-current" />
            Assistir vídeo obrigatório
          </button>
          <Link
            to={portalTo}
            className="flex min-h-12 w-full items-center justify-center rounded-xl border border-auth-muted/30 px-5 text-base font-medium text-auth-fg transition-colors duration-150 hover:bg-auth-fg/5"
          >
            Acessar o portal
          </Link>
        </div>
      </div>
    </div>
  );
}
