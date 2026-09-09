import { createFileRoute, Navigate } from "@tanstack/react-router";
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
  component: function Home() {
    return <Navigate to="/dashboard" />;
  },
});
