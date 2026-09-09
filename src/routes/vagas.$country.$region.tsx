import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/vagas/$country/$region")({
  component: () => <Outlet />,
});
