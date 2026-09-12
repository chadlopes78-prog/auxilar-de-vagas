import type { ErrorComponentProps } from "@tanstack/react-router";

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
      <p className="text-[11px] font-semibold tracking-[0.18em] text-muted">ERRO</p>
      <h1 className="text-3xl">Algo correu mal</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <a
        href="/login"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-fg"
      >
        Ir para o início de sessão
      </a>
    </main>
  );
}
