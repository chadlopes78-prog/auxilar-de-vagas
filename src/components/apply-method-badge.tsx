import { Building2, Globe, Mail, Zap } from "lucide-react";
import type { ApplyChannel } from "@/lib/types";

export function ApplyMethodBadge({ channel }: { channel: ApplyChannel }) {
  if (channel === "official_api") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
        <Zap className="size-3" />
        Candidatura rápida
      </span>
    );
  }
  if (channel === "internal") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg">
        <Building2 className="size-3" />
        Candidatura no nosso site
      </span>
    );
  }
  if (channel === "email") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold tracking-wide text-fg">
        <Mail className="size-3" />
        Candidatura por e-mail
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
      <Globe className="size-3" />
      Candidatura no portal oficial
    </span>
  );
}
