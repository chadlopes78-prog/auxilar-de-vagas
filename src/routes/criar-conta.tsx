import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/criar-conta")({
  head: () => ({ meta: [{ title: "Criar conta | Auxiliar de Vagas" }] }),
  component: () => <Navigate to="/register" />,
});
