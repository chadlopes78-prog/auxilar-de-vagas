import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Ocorreu um erro inesperado. Tente recarregar a página.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    if (/Maximum update depth/i.test(error.message)) {
      return "A página está a recarregar. Entre na sua conta para continuar.";
    }
    return error.message;
  }
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Algo correu mal</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <a
        href="/login"
        className="mt-2 inline-flex min-h-11 items-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-fg"
      >
        Ir para o início de sessão
      </a>
    </main>
  );
}