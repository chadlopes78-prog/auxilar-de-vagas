import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { createEmailAccount, signInEmailAccount } from "@/lib/auth/email-signup";
import { ensureProfile } from "@/lib/server/account";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GuestOnly } from "@/components/require-auth";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { toast } from "sonner";
import { SUPPORT_LOGIN_TEXT, supportUrl } from "@/components/support-whatsapp";
import { authErrorMessage } from "@/lib/auth-errors";
import { phoneToAuthEmail, toE164 } from "@/lib/phone-auth";
import { DialSelect } from "@/components/dial-select";

export function AuthFrame({ children }: { children: ReactNode }) {
  return <AuthSplit>{children}</AuthSplit>;
}

export function AuthSplit({
  children,
  quote = "Encontra a oportunidade certa para o teu próximo passo.",
}: {
  children: ReactNode;
  quote?: string;
}) {
  return (
    <GuestOnly>
      <div className="min-h-dvh md:grid md:grid-cols-2">
        <aside className="relative hidden flex-col justify-between bg-auth-bg px-10 py-10 text-auth-fg md:flex">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold">
            <BrandMark className="size-8" decorative />
            {APP_NAME}
          </Link>
          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-auth-muted">PORTAL DE EMPREGO</p>
            <h1 className="mt-5 text-4xl leading-[1.15] text-balance">{quote}</h1>
          </div>
          <p className="text-sm text-auth-muted">Moçambique · Angola · Portugal</p>
        </aside>
        <section className="flex min-h-dvh flex-col bg-bg px-5 py-8 sm:px-10 sm:py-12">
          <Link to="/" className="mb-10 flex items-center gap-2 text-sm font-bold md:hidden">
            <BrandMark className="size-8" decorative />
            {APP_NAME}
          </Link>
          <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">{children}</div>
          <a
            href={supportUrl(SUPPORT_LOGIN_TEXT)}
            target="_blank"
            rel="noreferrer"
            className="mx-auto mt-8 text-center text-sm text-muted hover:text-fg"
          >
            Precisa de ajuda? Fale connosco
          </a>
        </section>
      </div>
    </GuestOnly>
  );
}

function ModeTabs({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="mb-7 grid grid-cols-2 rounded-full bg-border p-1">
      <Link
        to="/login"
        className={`grid h-10 place-items-center rounded-full text-sm font-medium ${
          mode === "login" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        Entrar
      </Link>
      <Link
        to="/register"
        className={`grid h-10 place-items-center rounded-full text-sm font-medium ${
          mode === "register" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        Criar conta
      </Link>
    </div>
  );
}

function KindTabs({
  kind,
  onChange,
}: {
  kind: "email" | "phone";
  onChange: (k: "email" | "phone") => void;
}) {
  return (
    <div className="mb-5 grid grid-cols-2 rounded-full bg-border p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={`grid h-10 place-items-center rounded-full text-sm font-medium ${
          kind === "email" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        E-mail
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={`grid h-10 place-items-center rounded-full text-sm font-medium ${
          kind === "phone" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        Telefone
      </button>
    </div>
  );
}

export function LoginForm() {
  const [kind, setKind] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState("258");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const authEmail =
      kind === "email" ? email.trim().toLowerCase() : phoneToAuthEmail(dial, phone);
    if (kind === "email" && !authEmail.includes("@")) {
      setError("Escreva um e-mail válido.");
      return;
    }
    if (kind === "phone" && phone.replace(/\D/g, "").length < 7) {
      setError("Escreva um número de telefone válido.");
      return;
    }
    setBusy(true);
    try {
      await signInEmailAccount({ email: authEmail, password });
      window.location.assign("/dashboard");
    } catch (err) {
      const message = authErrorMessage(err, "Dados incorrectos. Verifique e tente novamente.");
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <ModeTabs mode="login" />
      <h2 className="text-3xl">Entra no teu portal</h2>
      <p className="mt-2 text-sm text-muted">Acede às tuas vagas e continua de onde paraste.</p>
      <form className="mt-7 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <KindTabs kind={kind} onChange={setKind} />
        {kind === "email" ? (
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@email.com"
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="login-phone">Número de telefone</Label>
            <div className="flex gap-2">
              <DialSelect id="login-dial" value={dial} onChange={setDial} />
              <Input
                id="login-phone"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="84 123 4567"
                className="min-w-0 flex-1"
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy ? "A entrar…" : "Entrar"}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link to="/forgot-password" className="text-muted hover:text-fg">
          Esqueceste a palavra-passe?
        </Link>
      </p>
      <p className="mt-6 text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link to="/register" className="font-medium text-primary">
          Criar conta
        </Link>
      </p>
    </AuthSplit>
  );
}

export function RegisterForm() {
  const [kind, setKind] = useState<"email" | "phone">("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState("258");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = fullName.trim();
    if (!name) {
      setError("Escreva o seu nome.");
      return;
    }
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    let authEmail = email.trim().toLowerCase();
    let e164: string | null = null;
    if (kind === "phone") {
      if (phone.replace(/\D/g, "").length < 7) {
        setError("Escreva um número de telefone válido.");
        return;
      }
      e164 = toE164(dial, phone);
      authEmail = phoneToAuthEmail(dial, phone);
    } else if (!authEmail.includes("@")) {
      setError("Escreva um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      const result = await createEmailAccount({ email: authEmail, password, name });
      await ensureProfile({
        data: { email: kind === "email" ? authEmail : null, name, phone: e164 },
      }).catch(() => null);
      toast.success(result.created ? "Conta criada com sucesso." : "Já tinha conta. Sessão iniciada.");
      window.location.assign("/dashboard");
    } catch (err) {
      const message = authErrorMessage(err, "Não foi possível criar a conta.");
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <AuthSplit quote="Cria a tua conta uma vez. Depois o portal lembra-se de ti.">
      <ModeTabs mode="register" />
      <h2 className="text-3xl">Criar conta</h2>
      <p className="mt-2 text-sm text-muted">Só o essencial para começar.</p>
      <form className="mt-7 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <KindTabs kind={kind} onChange={setKind} />
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Nome completo"
          />
        </div>
        {kind === "email" ? (
          <div>
            <Label htmlFor="reg-email">E-mail</Label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nome@email.com"
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="reg-phone">Número de telefone</Label>
            <div className="flex gap-2">
              <DialSelect id="reg-dial" value={dial} onChange={setDial} />
              <Input
                id="reg-phone"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="84 123 4567"
                className="min-w-0 flex-1"
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="reg-password">Palavra-passe</Label>
          <Input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <Label htmlFor="reg-confirm">Confirmar palavra-passe</Label>
          <Input
            id="reg-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Repita a palavra-passe"
          />
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button className="w-full" size="lg" disabled={busy}>
          {busy ? "A criar conta…" : "Criar conta"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Já tem uma conta?{" "}
        <Link to="/login" className="font-medium text-primary">
          Entrar
        </Link>
      </p>
    </AuthSplit>
  );
}
