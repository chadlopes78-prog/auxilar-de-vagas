import { Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isVideoConfigured, VIDEO_URL } from "@/lib/video";
import { cn } from "@/lib/utils";

export function openRequiredVideo() {
  if (!isVideoConfigured()) {
    toast.message("O vídeo ainda não está configurado. Coloque o link em VIDEO_URL.");
    return;
  }
  window.open(VIDEO_URL, "_blank", "noopener,noreferrer");
}

export function WatchVideoHero() {
  const [paused, setPaused] = useState(false);

  function onClick() {
    setPaused(true);
    openRequiredVideo();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "video-cta-loud gate-video-cta relative z-0 flex min-h-16 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-bold",
        paused && "is-paused",
      )}
    >
      <Play className="size-4 fill-current" />
      Assistir vídeo obrigatório
    </button>
  );
}

export function WatchVideoHeader({ compact }: { compact?: boolean }) {
  const [paused, setPaused] = useState(false);

  function onClick() {
    setPaused(true);
    openRequiredVideo();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "video-cta-soft inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-fg sm:h-10 sm:min-h-10 sm:px-3.5 sm:text-sm",
        paused && "is-paused",
      )}
      aria-label="Assistir vídeo obrigatório"
    >
      <Play className="size-3 fill-current sm:size-3.5" />
      {compact ? "Vídeo obrigatório" : "Assistir vídeo obrigatório"}
    </button>
  );
}

export function WatchVideoMenuItem({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-2 py-3 text-left text-base font-semibold text-primary"
      onClick={() => {
        onClick?.();
        openRequiredVideo();
      }}
    >
      <Play className="size-4 fill-current" />
      Assistir vídeo obrigatório
    </button>
  );
}
