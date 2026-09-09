const CODE_MESSAGES: Record<string, string> = {
  INVALID_ORIGIN:
    "Não foi possível validar o endereço do site. Recarregue a página e tente novamente.",
  USER_ALREADY_EXISTS: "Já existe uma conta com este email. Entre ou recupere a palavra-passe.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com este email.",
  INVALID_EMAIL: "O email não é válido.",
  INVALID_PASSWORD: "Email ou palavra-passe incorrectos.",
  INVALID_EMAIL_OR_PASSWORD: "Email ou palavra-passe incorrectos.",
  PASSWORD_TOO_SHORT: "A palavra-passe deve ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A palavra-passe é demasiado longa.",
  FAILED_TO_CREATE_USER: "Não foi possível criar a conta. Tente novamente dentro de instantes.",
  SIGN_UP_DISABLED: "O registo está temporariamente indisponível.",
  ACCOUNT_NOT_LINKED: "Esta conta Google já está associada a outro método de entrada.",
  VALIDATION_ERROR: "Verifique os dados do formulário e tente novamente.",
  PROVIDER_NOT_FOUND: "O login com Google ainda não está activo neste site. Use email e palavra-passe.",
};

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
  if (!message || /failed to fetch|internal server error|undefined/i.test(message)) {
    return fallback;
  }
  if (CODE_MESSAGES[message]) return CODE_MESSAGES[message];
  return message;
}
