import { env } from "@/lib/env.server";

function headerName(authType: string) {
  if (authType === "bearer") return "Authorization";
  if (authType === "x-api-key") return "X-API-Key";
  return "Authorization";
}

function headerValue(authType: string, secret: string) {
  if (authType === "bearer") return `Bearer ${secret}`;
  return secret;
}

/**
 * Real outbound call used only when an official applications endpoint and
 * secret are configured. Never invents a success response.
 */
export async function postOfficialApplication(opts: {
  endpoint: string;
  apiKey: string;
  authType?: string;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; httpCode: number; payload: unknown; message: string }> {
  const authType = opts.authType ?? "bearer";
  try {
    const res = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [headerName(authType)]: headerValue(authType, opts.apiKey),
      },
      body: JSON.stringify(opts.body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text.slice(0, 400) };
    }
    const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const externalId = rec.id ?? rec.application_id ?? rec.applicationId ?? null;
    if (!res.ok) {
      return {
        ok: false,
        httpCode: res.status,
        payload,
        message: `A API oficial devolveu HTTP ${res.status}. A candidatura não foi confirmada.`,
      };
    }
    return {
      ok: true,
      httpCode: res.status,
      payload: { ...rec, externalId },
      message: "Candidatura enviada com sucesso.",
    };
  } catch (e) {
    return {
      ok: false,
      httpCode: 0,
      payload: null,
      message: e instanceof Error ? e.message : "Falha de rede ao contactar a API oficial.",
    };
  }
}

export async function getOfficialStatus(opts: {
  endpoint: string;
  apiKey: string;
  authType?: string;
}): Promise<{ ok: boolean; httpCode: number; payload: unknown }> {
  const authType = opts.authType ?? "bearer";
  try {
    const res = await fetch(opts.endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        [headerName(authType)]: headerValue(authType, opts.apiKey),
      },
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    return { ok: res.ok, httpCode: res.status, payload };
  } catch {
    return { ok: false, httpCode: 0, payload: null };
  }
}

export function pair(urlKey: string, secretKey: string) {
  const endpoint = env(urlKey);
  const apiKey = env(secretKey);
  return { endpoint, apiKey, ready: Boolean(endpoint && apiKey) };
}
