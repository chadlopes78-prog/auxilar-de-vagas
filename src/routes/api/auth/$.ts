import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { readDatabaseUrl } from "@/lib/database-url";

function failResponse(status: number, originish: boolean) {
  const dbMissing = !readDatabaseUrl() && Boolean(process.env.VERCEL || process.env.NETLIFY);
  return Response.json(
    {
      code: originish ? "INVALID_ORIGIN" : dbMissing ? "FAILED_TO_CREATE_USER" : "FAILED_TO_CREATE_USER",
      message: originish
        ? "Não foi possível validar o endereço do site. Recarregue a página e tente novamente."
        : "Não foi possível concluir. Tente novamente.",
    },
    { status: originish ? 403 : status >= 400 ? status : 500 },
  );
}

async function handleAuth(request: Request) {
  try {
    const res = await auth.handler(request);
    if (res.status < 500) return res;
    const text = await res.text();
    if (text) {
      return new Response(text, {
        status: res.status,
        headers: res.headers,
      });
    }
    return failResponse(res.status, false);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[auth]", err);
    return failResponse(500, /origin|allowed hosts|base url/i.test(raw));
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
