import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Painel | Auxiliar de Vagas" }] }),
  component: function OnboardingRedirect() {
    return <Navigate to="/dashboard" />;
  },
});
