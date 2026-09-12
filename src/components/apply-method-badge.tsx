import type { ApplyChannel } from "@/lib/types";

const LABELS: Record<ApplyChannel, string> = {
  official_api: "Candidatura rápida",
  internal: "No nosso site",
  email: "Por e-mail",
  official_redirect: "Portal oficial",
};

export function ApplyMethodBadge({ channel }: { channel: ApplyChannel }) {
  return <span className="text-xs text-muted">{LABELS[channel] ?? "Candidatura"}</span>;
}
