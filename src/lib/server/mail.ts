import { env } from "@/lib/env.server";
import { APP_NAME } from "@/lib/brand";

type MailResult =
  | { ok: true; httpCode: number; message: string; provider: string }
  | { ok: false; httpCode: number; message: string; provider: string };

async function sendResend(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<MailResult> {
  const from = env("APPLICATION_MAIL_FROM") ?? env("MAIL_FROM") ?? env("SUPABASE_SMTP_ADMIN_EMAIL");
  const resend = env("RESEND_API_KEY");
  if (!resend || !from) {
    return {
      ok: false,
      httpCode: 0,
      message: "O envio por e-mail ainda não está configurado (RESEND_API_KEY e MAIL_FROM).",
      provider: "none",
    };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        reply_to: input.replyTo,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return {
        ok: false,
        httpCode: res.status,
        message: `O envio por e-mail devolveu HTTP ${res.status}.`,
        provider: "resend",
      };
    }
    return { ok: true, httpCode: res.status, message: `E-mail enviado para ${input.to}.`, provider: "resend" };
  } catch (e) {
    return {
      ok: false,
      httpCode: 0,
      message: e instanceof Error ? e.message : "Falha de rede ao enviar o e-mail.",
      provider: "resend",
    };
  }
}

/** Welcome / confirmation email via Resend, using the same SMTP account as Supabase if configured. */
export async function sendWelcomeEmail(input: {
  to: string;
  name?: string | null;
}): Promise<MailResult> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { ok: false, httpCode: 0, message: "E-mail inválido.", provider: "none" };
  }
  const name = input.name?.trim() || "olá";
  const site = env("BETTER_AUTH_URL") ?? env("URL") ?? env("SITE_URL") ?? "";
  const loginUrl = site ? `${site.replace(/\/+$/, "")}/login` : "/login";
  const subject = `Bem-vindo ao ${APP_NAME}`;
  const text = [
    `Olá ${name},`,
    "",
    `A sua conta no ${APP_NAME} foi criada com sucesso.`,
    "Já pode entrar, completar o perfil e candidatar-se a vagas em Moçambique, Angola e Portugal.",
    "",
    site ? `Entrar: ${loginUrl}` : "Abra o site e entre com o mesmo e-mail.",
    "",
    "Se não criou esta conta, ignore este e-mail.",
    "",
    `Equipa ${APP_NAME}`,
  ].join("\n");
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <p>Olá ${escapeHtml(name)},</p>
      <p>A sua conta no <strong>${escapeHtml(APP_NAME)}</strong> foi criada com sucesso.</p>
      <p>Já pode entrar, completar o perfil e candidatar-se a vagas em Moçambique, Angola e Portugal.</p>
      ${site ? `<p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#0F6E4C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Entrar na minha conta</a></p>` : ""}
      <p style="color:#666;font-size:13px">Se não criou esta conta, ignore este e-mail.</p>
      <p>Equipa ${escapeHtml(APP_NAME)}</p>
    </div>
  `;
  return sendResend({ to, subject, text, html });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendApplicationEmail(input: {
  to: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobTitle: string;
  companyName: string;
  cvName: string | null;
  coverLetter: string;
  answers?: Record<string, string>;
}): Promise<{ ok: true; httpCode: number; message: string } | { ok: false; httpCode: number; message: string }> {
  const to = input.to.trim().toLowerCase();
  if (!to || !to.includes("@") || to.includes("example.com") || to.includes("invent")) {
    return { ok: false, httpCode: 0, message: "Esta vaga não indica um e-mail oficial de candidatura." };
  }
  const lines = [
    `Candidatura à vaga: ${input.jobTitle}`,
    `Empresa: ${input.companyName}`,
    "",
    `Nome: ${input.candidateName}`,
    `E-mail: ${input.candidateEmail}`,
    `Telefone: ${input.candidatePhone}`,
    input.cvName ? `CV: ${input.cvName}` : "CV: não anexado",
    "",
  ];
  if (input.coverLetter) {
    lines.push("Carta de apresentação:", input.coverLetter, "");
  }
  if (input.answers && Object.keys(input.answers).length) {
    lines.push("Respostas ao formulário:");
    for (const [k, v] of Object.entries(input.answers)) lines.push(`- ${k}: ${v}`);
    lines.push("");
  }
  lines.push("Enviado através do Auxilar de Vagas. Este e-mail usa o endereço publicado na própria vaga.");
  const text = lines.join("\n");
  const subject = `Candidatura: ${input.jobTitle} — ${input.candidateName}`;
  const result = await sendResend({
    to,
    subject,
    text,
    replyTo: input.candidateEmail,
  });
  if (result.ok) return { ok: true, httpCode: result.httpCode, message: `Candidatura enviada para ${to}.` };
  return {
    ok: false,
    httpCode: result.httpCode,
    message:
      result.provider === "none"
        ? "O envio por e-mail ainda não está configurado neste ambiente. A candidatura não foi marcada como enviada."
        : result.message,
  };
}
