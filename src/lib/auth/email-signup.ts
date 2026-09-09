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
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as AuthJson;
  return { ok: res.ok, status: res.status, data };
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
  const signup = await postAuth("/api/auth/sign-up/email", input);
  if (signup.ok && (signup.data.user || signup.data.token)) {
    rememberSessionToken(signup.data.token);
    return { created: true };
  }

  const code = signup.data.code || "";
  if (signup.status === 422 || code.includes("USER_ALREADY_EXISTS")) {
    try {
      await signInEmailAccount({ email: input.email, password: input.password });
      return { created: false };
    } catch {
      const err = new Error(
        "Já existe uma conta com este email. Entre com a palavra-passe correcta.",
      ) as Error & { code?: string; status?: number };
      err.code = "USER_ALREADY_EXISTS";
      err.status = 422;
      throw err;
    }
  }

  fail(signup.data, signup.status);
}
