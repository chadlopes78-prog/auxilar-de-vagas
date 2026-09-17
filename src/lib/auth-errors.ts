const CODE_MESSAGES: Record<string, string> = {
  INVALID_ORIGIN:
    "Não foi possível validar o endereço do site. Recarregue a página e tente novamente.",
  USER_ALREADY_EXISTS: "Já existe uma conta com estes dados. Clique na opção Entrar.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Já existe uma conta com estes dados. Clique na opção Entrar.",
  INVALID_EMAIL: "O email não é válido.",
  INVALID_PASSWORD: "Email ou palavra-passe incorrectos.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou palavra-passe incorrectos.",
  PASSWORD_TOO_SHORT: "A palavra-passe deve ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A palavra-passe é demasiado longa.",
  FAILED_TO_CREATE_USER: "Não foi possível criar a conta. Tente novamente dentro de instantes.",
  AUTH_NO_DB: "Não foi possível criar a conta. Tente novamente dentro de instantes.",
  SIGN_UP_DISABLED: "O registo está temporariamente indisponível.",
  ACCOUNT_NOT_LINKED: "Esta conta já está associada a outro método de entrada.",
  VALIDATION_ERROR: "Verifique os dados do formulário e tente novamente.",
  PROVIDER_NOT_FOUND: "Use e-mail, telefone e palavra-passe para entrar.",
};

export function authErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "";
  const rec = err as { code?: string; error?: { code?: string } };
  return rec.code || rec.error?.code || "";
}

export function authErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const rec = err as { status?: number; error?: { status?: number } };
  return rec.status ?? rec.error?.status;
}

export function isInvalidCredentials(err: unknown): boolean {
  const code = authErrorCode(err);
  const status = authErrorStatus(err);
  return (
    code === "INVALID_EMAIL_OR_PASSWORD" ||
    code === "INVALID_PASSWORD" ||
    status === 401
  );
}

export function isExistingAccountError(err: unknown): boolean {
  const code = authErrorCode(err);
  if (code.includes("USER_ALREADY_EXISTS")) return true;
  const rec = err as { message?: string; status?: number } | null;
  if (rec?.status === 422) return true;
  return /already exists/i.test(rec?.message ?? "");
}

export function authErrorMessage(
  err: unknown,
  fallback = "Não foi possível concluir. Tente novamente.",
): string {
  if (!err) return fallback;
  const rec = err as {
    message?: string;
    code?: string;
    status?: number;
    statusText?: string;
    error?: { message?: string; code?: string; status?: number };
  };
  const code = rec.code || rec.error?.code || "";
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  const status = rec.status ?? rec.error?.status;
  if (status === 500 || status === 502 || status === 503) {
    return "O servidor não conseguiu criar a conta. Tente novamente dentro de instantes.";
  }
  if (status === 403) {
    return CODE_MESSAGES.INVALID_ORIGIN;
  }
  const message = rec.message || rec.error?.message || rec.statusText || "";
  if (/already exists/i.test(message)) return CODE_MESSAGES.USER_ALREADY_EXISTS;
  if (/invalid email or password/i.test(message)) return CODE_MESSAGES.INVALID_EMAIL_OR_PASSWORD;
  if (/invalid email/i.test(message)) return CODE_MESSAGES.INVALID_EMAIL;
  if (/password too short/i.test(message)) return CODE_MESSAGES.PASSWORD_TOO_SHORT;
  if (!message || /failed to fetch|internal server error|undefined|http \d/i.test(message)) {
    return fallback;
  }
  if (CODE_MESSAGES[message]) return CODE_MESSAGES[message];
  if (/^[A-Z_]+$/.test(message) || /\b(user|email|password|invalid|failed)\b/i.test(message)) {
    return fallback;
  }
  return message;
}
