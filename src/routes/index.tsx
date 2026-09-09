import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth-screen";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — ${APP_TAGLINE}` },
      {
        name: "description",
        content: "Pesquise vagas em Moçambique, Angola e Portugal num só lugar.",
      },
    ],
  }),
  component: LoginForm,
});