import { createFileRoute } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth-screen";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar | Auxilar de Vagas" }] }),
  component: LoginForm,
});
