import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/jobs")({
  component: () => <Navigate to="/admin" />,
});
