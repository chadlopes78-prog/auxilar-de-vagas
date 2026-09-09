import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function money(n: number | null | undefined, currency?: string | null) {
  if (n == null) return null;
  const formatted = new Intl.NumberFormat("pt-PT").format(n);
  return currency ? `${formatted} ${currency}` : formatted;
}

export function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const days = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days === 2) return "Publicado há 2 dias";
  return `Publicado há ${days} dias`;
}

export function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 3 * 86400000;
}

export const EMPLOYMENT = [
  { id: "full-time", label: "Tempo Inteiro" },
  { id: "part-time", label: "Tempo Parcial" },
  { id: "contract", label: "Contrato" },
  { id: "internship", label: "Estágio" },
  { id: "temporary", label: "Temporário" },
  { id: "freelance", label: "Freelance" },
] as const;

export const WORK_MODELS = [
  { id: "on-site", label: "Presencial" },
  { id: "remote", label: "Remoto" },
  { id: "hybrid", label: "Híbrido" },
] as const;

export const EXPERIENCE = [
  { id: "none", label: "Sem experiência" },
  { id: "entry", label: "Início de carreira" },
  { id: "1-2", label: "1–2 anos" },
  { id: "3-5", label: "3–5 anos" },
  { id: "5+", label: "5+ anos" },
] as const;

export const APP_STATUSES = [
  "sent",
  "received",
  "under_review",
  "interview",
  "accepted",
  "rejected",
] as const;

export const EMPLOYER_STATUSES = [
  { id: "sent", label: "Enviada" },
  { id: "received", label: "Recebida" },
  { id: "under_review", label: "Em análise" },
  { id: "interview", label: "Entrevista" },
  { id: "accepted", label: "Aceite" },
  { id: "rejected", label: "Não selecionada" },
] as const;

export function labelOf(
  list: readonly { id: string; label: string }[],
  id: string,
) {
  return list.find((x) => x.id === id)?.label ?? id;
}

export function fingerprint(title: string, company: string, city?: string | null) {
  const n = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${n(title)}|${n(company)}|${n(city ?? "")}`;
}

export function textTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );
}

export function textSimilarity(a: string, b: string) {
  const A = textTokens(a);
  const B = textTokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n += 1;
  return (2 * n) / (A.size + B.size);
}

export function likelySameJob(
  a: { title: string; company: string; description?: string; city?: string; applyEmail?: string; url?: string },
  b: { title: string; company: string; description?: string; city?: string; applyEmail?: string; url?: string },
) {
  if (a.url && b.url && a.url === b.url) return true;
  if (a.applyEmail && b.applyEmail && a.applyEmail === b.applyEmail) {
    const titleSim = textSimilarity(a.title, b.title);
    if (titleSim >= 0.6) return true;
  }
  const companySame =
    textSimilarity(a.company, b.company) >= 0.8 || a.company.trim().toLowerCase() === b.company.trim().toLowerCase();
  const titleSim = textSimilarity(a.title, b.title);
  const descSim = textSimilarity(a.description ?? "", b.description ?? "");
  const citySame = !a.city || !b.city || a.city.trim().toLowerCase() === b.city.trim().toLowerCase();
  if (companySame && titleSim >= 0.85 && citySame) return true;
  if (companySame && titleSim >= 0.6 && descSim >= 0.7) return true;
  if (titleSim >= 0.9 && descSim >= 0.55 && citySame) return true;
  return false;
}


