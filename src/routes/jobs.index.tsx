import { createFileRoute, Navigate } from "@tanstack/react-router";
import { parseJobSearch } from "@/components/jobs-listing";

export const Route = createFileRoute("/jobs/")({
  validateSearch: parseJobSearch,
  component: function JobsRedirect() {
    const search = Route.useSearch();
    return <Navigate to="/vagas" search={search} />;
  },
});
