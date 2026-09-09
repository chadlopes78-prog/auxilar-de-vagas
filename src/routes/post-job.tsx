import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/post-job")({
  head: () => ({ meta: [{ title: "Procurar vagas | Auxilar de Vagas" }] }),
  component: () => <Navigate to="/vagas" />,
});
