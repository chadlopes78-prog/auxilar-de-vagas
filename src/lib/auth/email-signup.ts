import { rememberSessionToken } from "./client";

type AuthJson = {
  token?: string;
  user?: { id?: string };
  message?: string;
  code?: string;
};

async function postAuth(path: string, body: Record<string, string>): Promise<{
  ok: boolean;
  status: number;
  data: AuthJson;
}> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: AuthJson = {};
    try {
      data = text ? (JSON.parse(text) as AuthJson) : {};
    } catch {
      data = { message: "O servidor não respondeu correctamente. Tente novamente." };
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw Object.assign(
      new Error(
        aborted
          ? "A ligação demorou demasiado. Verifique a internet e tente novamente."
          : "Não foi possível contactar o servidor. Verifique a internet e tente novamente.",
      ),
      { status: 0 },
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function fail(data: AuthJson, status: number): never {
  const err = new Error(data.message || `HTTP ${status}`) as Error & {
    code?: string;
    status?: number;
  };
  err.code = data.code;
  err.status = status;
  throw err;
}

function alreadyExists(status: number, data: AuthJson): boolean {
  const code = data.code || "";
  return (
    status === 422 ||
    code.includes("USER_ALREADY_EXISTS") ||
    /already exists/i.test(data.message || "")
  );
}

export async function signInEmailAccount(input: {
  email: string;
  password: string;
}): Promise<void> {
  const signin = await postAuth("/api/auth/sign-in/email", input);
  if (signin.ok && (signin.data.user || signin.data.token)) {
    rememberSessionToken(signin.data.token);
    return;
  }
  fail(signin.data, signin.status);
}

export async function createEmailAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ created: boolean }> {
  let signup = await postAuth("/api/auth/sign-up/email", input);

  if (!signup.ok && (signup.status === 500 || signup.status === 502 || signup.status === 503)) {
    await new Promise((r) => setTimeout(r, 600));
    signup = await postAuth("/api/auth/sign-up/email", input);
  }

  if (signup.ok && (signup.data.user || signup.data.token)) {
    rememberSessionToken(signup.data.token);
    return { created: true };
  }

  if (alreadyExists(signup.status, signup.data)) {
    try {
      await signInEmailAccount({ email: input.email, password: input.password });
      return { created: false };
    } catch {
      const err = new Error(
        "Já existe uma conta com estes dados. Clique na opção Entrar.",
      ) as Error & { code?: string; status?: number };
      err.code = "USER_ALREADY_EXISTS";
      err.status = 422;
      throw err;
    }
  }

  fail(signup.data, signup.status);
}
