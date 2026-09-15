import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { WatchVideoHero, openRequiredVideo } from "@/components/watch-video";

export function GateScreen() {
  const { user, isPending } = useCurrentUserState();
  const portalTo = !isPending && user ? "/dashboard" : "/login";
  const navigate = useNavigate();
  const [promptOpen, setPromptOpen] = useState(false);

  function openPortalPrompt() {
    setPromptOpen(true);
  }

  function watchVideoFromPrompt() {
    setPromptOpen(false);
    openRequiredVideo();
  }

  function continueToPortal() {
    setPromptOpen(false);
    void navigate({ to: portalTo });
  }

  return (
    <div className="gate-screen flex min-h-dvh flex-col">
      <header className="gate-topbar flex items-center justify-end px-4 py-5 sm:px-10 lg:px-14">
        <button type="button" className="gate-nav-link shrink-0 text-sm font-semibold" onClick={openPortalPrompt}>
          Acessar o portal
        </button>
      </header>

      <main className="gate-main mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 pb-16 pt-4 sm:px-8">
        <div className="gate-stage mx-auto w-full max-w-[34rem] text-center">
          <p className="gate-kicker">PORTAL DE EMPREGO</p>
          <h1 className="gate-title">
            Assista ao vídeo agora para não falhar ao resgatar a vaga
          </h1>
          <div className="gate-actions">
            <WatchVideoHero />
            <button type="button" className="gate-portal-cta" onClick={openPortalPrompt}>
              Acessar o portal
            </button>
          </div>
        </div>
      </main>

      {promptOpen ? (
        <GatePortalPrompt
          onWatch={watchVideoFromPrompt}
          onContinue={continueToPortal}
          onDismiss={() => setPromptOpen(false)}
        />
      ) : null}
    </div>
  );
}

function GatePortalPrompt({
  onWatch,
  onContinue,
  onDismiss,
}: {
  onWatch: () => void;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(".gate-prompt-primary")?.focus();
    }, 30);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  return createPortal(
    <div className="gate-prompt" role="presentation">
      <button type="button" className="gate-prompt-backdrop" aria-label="Fechar" onClick={onDismiss} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="gate-prompt-card"
      >
        <h2 id={titleId} className="gate-prompt-title">
          Recomendamos que assista ao vídeo antes de continuar
        </h2>
        <p id={descId} className="gate-prompt-copy">
          O vídeo explica informações importantes sobre a vaga e como funciona o processo para Portugal. Recomendamos que assista ao vídeo para entender todos os detalhes.
        </p>
        <button type="button" className="gate-prompt-primary" onClick={onWatch}>
          ASSISTIR AO VÍDEO
        </button>
        <p className="gate-prompt-note">
          Mas, caso não queira assistir ao vídeo agora, pode continuar directamente para o portal.
        </p>
        <button type="button" className="gate-prompt-secondary" onClick={onContinue}>
          ACESSAR O PORTAL
        </button>
      </div>
    </div>,
    document.body,
  );
}
