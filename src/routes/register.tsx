import { createFileRoute } from "@tanstack/react-router";
import { RegisterForm } from "@/components/auth-screen";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta | Auxiliar de Vagas" }] }),
  component: RegisterForm,
});
