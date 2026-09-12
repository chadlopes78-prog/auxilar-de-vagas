import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { createEmailAccount, signInEmailAccount } from "@/lib/auth/email-signup";
import { ensureProfile } from "@/lib/server/account";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { GuestOnly } from "@/components/require-auth";
import { APP_NAME } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";
import { toast } from "sonner";
import { SUPPORT_LOGIN_TEXT, supportUrl, WhatsAppIcon } from "@/components/support-whatsapp";
import { authErrorMessage } from "@/lib/auth-errors";
import {
  COUNTRY_DIALS,
  identifierToAuthEmail,
  phoneToAuthEmail,
  toE164,
} from "@/lib/phone-auth";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <GuestOnly>
      <div className="auth-stage flex min-h-dvh flex-col items-center justify-start px-4 py-6 sm:justify-center sm:py-10">
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <span className="auth-dot" />
        <div className="auth-glow" aria-hidden />
        <Link to="/" className="auth-enter relative z-10 mb-6 flex items-center gap-2">
          <BrandMark className="size-10 rounded-xl" decorative />
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>
        {children}
        <a
          href={supportUrl(SUPPORT_LOGIN_TEXT)}
          target="_blank"
          rel="noreferrer"
          className="wa-pulse auth-enter auth-enter-4 relative z-10 mt-6 inline-flex min-h-12 max-w-full items-center gap-2 rounded-full bg-whatsapp px-4 text-center text-sm font-medium text-whatsapp-fg transition-transform duration-150 hover:brightness-105 active:scale-[0.96]"
        >
          <WhatsAppIcon className="size-5" />
          Tens alguma dúvida? Contacta o suporte
        </a>
      </div>
    </GuestOnly>
  );
}

function ModeTabs({ mode }: { mode: "login" | "register" }) {
  return (
    <div className="mb-5 grid grid-cols-2 rounded-xl bg-bg p-1">
      <Link
        to="/login"
        className={`grid h-10 place-items-center rounded-[10px] text-sm font-medium transition-colors ${
          mode === "login" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
        }`}
      >
        Entrar
      </Link>
      <Link
        to="/register"
        className={`grid h-10 place-items-center rounded-[10px] text-sm font-medium transition-colors ${
          mode === "register" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
        }`}
      >
        Criar conta
      </Link>
    </div>
  );
}

function SignupKindTabs({
  kind,
  onChange,
}: {
  kind: "email" | "phone";
  onChange: (k: "email" | "phone") => void;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-bg p-1">
      <button
        type="button"
        onClick={() => onChange("email")}
        className={`grid h-10 place-items-center rounded-[10px] text-sm font-medium ${
          kind === "email" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        Com e-mail
      </button>
      <button
        type="button"
        onClick={() => onChange("phone")}
        className={`grid h-10 place-items-center rounded-[10px] text-sm font-medium ${
          kind === "phone" ? "bg-surface text-fg shadow-sm" : "text-muted"
        }`}
      >
        Com telefone
      </button>
    </div>
  );
}

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const email = identifierToAuthEmail(identifier);
    if (!email) {
      setError("Escreva o e-mail ou o número de telefone.");
      return;
    }
    setBusy(true);
    try {
      await signInEmailAccount({ email, password });
      window.location.assign("/dashboard");
    } catch (err) {
      const message = authErrorMessage(err, "Dados incorrectos. Verifique e tente novamente.");
      setError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-5 sm:p-8">
        <ModeTabs mode="login" />
        <h1 className="text-2xl text-fg sm:text-3xl">Bem-vindo de volta</h1>
        <p className="mt-1 text-sm text-muted">Entre com e-mail ou número de telefone.</p>
        <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <Label htmlFor="identifier">E-mail ou número de telefone</Label>
            <Input
              id="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="nome@email.com ou 84 123 4567"
            />
          </div>
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
          <Button className="btn-shine w-full" size="lg" disabled={busy}>
            {busy ? "A entrar…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-3 text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Esqueceste a palavra-passe?
          </Link>
        </p>
        <p className="mt-5 text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar uma conta
          </Link>
        </p>
      </div>
    </AuthFrame>
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
      const result = await createEmailAccount({
        email: authEmail,
        password,
        name,
      });
      await ensureProfile({
        data: { email: kind === "email" ? authEmail : e164, name, phone: e164 },
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
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-5 sm:p-8">
        <ModeTabs mode="register" />
        <h1 className="text-2xl text-fg sm:text-3xl">Criar conta</h1>
        <p className="mt-1 text-sm text-muted">Use e-mail ou número de telefone.</p>
        <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <SignupKindTabs kind={kind} onChange={setKind} />
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
                <Select
                  id="reg-dial"
                  value={dial}
                  onChange={(e) => setDial(e.target.value)}
                  className="w-[9.5rem] shrink-0"
                  aria-label="Código do país"
                >
                  {COUNTRY_DIALS.map((c) => (
                    <option key={c.code} value={c.dial}>
                      {c.code} +{c.dial}
                    </option>
                  ))}
                </Select>
                <Input
                  id="reg-phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="84 123 4567"
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
          <Button className="btn-shine w-full" size="lg" disabled={busy}>
            {busy ? "A criar conta…" : "Criar conta"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          Já tem uma conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}
