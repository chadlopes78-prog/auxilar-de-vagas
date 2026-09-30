import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Auxiliar de Vagas" },
      {
        name: "description",
        content: "Pesquise vagas em Moçambique, Angola e Portugal num só lugar.",
      },
    ],
  }),
  component: LoginForm,
});
