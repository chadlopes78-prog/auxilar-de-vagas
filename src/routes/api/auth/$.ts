import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

async function handleAuth(request: Request) {
  try {
    return await auth.handler(request);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[auth]", err);
    const originish = /origin|allowed hosts|base url/i.test(raw);
    return Response.json(
      {
        code: originish ? "INVALID_ORIGIN" : "FAILED_TO_CREATE_USER",
        message: originish
          ? "Não foi possível validar o endereço do site. Recarregue a página e tente novamente."
          : "Não foi possível concluir. Tente novamente.",
      },
      { status: originish ? 403 : 500 },
    );
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
