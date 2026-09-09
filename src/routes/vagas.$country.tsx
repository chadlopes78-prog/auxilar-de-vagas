import { createFileRoute, Outlet } from "@tanstack/react-router";
import { parseJobSearch } from "@/components/jobs-listing";

export const Route = createFileRoute("/vagas/$country")({
  validateSearch: parseJobSearch,
  component: () => <Outlet />,
});
