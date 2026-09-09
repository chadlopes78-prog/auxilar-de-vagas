import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { authEnabled } from "@/lib/auth/client";
import { createEmailAccount, signInEmailAccount } from "@/lib/auth/email-signup";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GuestOnly } from "@/components/require-auth";
import { APP_MARK, APP_NAME } from "@/lib/brand";
import { toast } from "sonner";
import { SUPPORT_LOGIN_TEXT, supportUrl, WhatsAppIcon } from "@/components/support-whatsapp";
import { authErrorMessage } from "@/lib/auth-errors";

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
        <div className="auth-enter relative z-10 mb-6 flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-xs font-bold tracking-tight text-primary-fg">
            {APP_MARK}
          </span>
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </div>
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.97-1.07 7.96-2.93l-3.88-3c-1.08.73-2.47 1.16-4.08 1.16-3.14 0-5.8-2.12-6.75-4.97H1.24v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.26A7.2 7.2 0 0 1 4.87 12c0-.79.14-1.55.38-2.26V6.65H1.24A12 12 0 0 0 0 12c0 1.94.46 3.77 1.24 5.35l4.01-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.33.6 4.57 1.78l3.43-3.43C17.96 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.24 6.65l4.01 3.09C6.2 6.87 8.86 4.75 12 4.75Z"
      />
    </svg>
  );
}

function SocialButtons({ callbackURL: _callbackURL }: { callbackURL: string }) {
  const [error, setError] = useState("");
  if (!authEnabled) {
    return <p className="text-sm text-muted">O início de sessão está desactivado.</p>;
  }

  function start() {
    const message =
      "O login com Google ainda não está activo neste site. Crie conta com email e palavra-passe.";
    setError(message);
    toast.error(message);
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 bg-white text-neutral-800 hover:bg-neutral-50"
        onClick={start}
      >
        <GoogleMark />
        Continuar com Google
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInEmailAccount({ email, password });
      window.location.assign("/dashboard");
    } catch (err) {
      const message = authErrorMessage(err, "Email ou palavra-passe incorrectos.");
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
        <p className="mt-1 text-sm text-muted">Entre na sua conta para continuar.</p>
        <form className="mt-6 space-y-3" onSubmit={(e) => void onEmail(e)}>
          <div>
            <Label htmlFor="email">Email</Label>
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
            {busy ? "A entrar…" : "Entrar na minha conta"}
          </Button>
        </form>
        <p className="mt-3 text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Esqueceu a palavra-passe?
          </Link>
        </p>
        <div className="my-5 h-px bg-border" />
        <SocialButtons callbackURL="/dashboard" />
        <p className="mt-5 text-center text-sm text-muted">
          Ainda não tem uma conta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
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
    setBusy(true);
    try {
      const result = await createEmailAccount({
        email: mail,
        password,
        name,
      });
      toast.success(
        result.created ? "Conta criada com sucesso." : "Já tinha conta. Sessão iniciada.",
      );
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
        <h1 className="text-2xl text-fg sm:text-3xl">Criar a sua conta</h1>
        <p className="mt-1 text-sm text-muted">Preencha os dados uma vez. Depois acede ao painel.</p>
        <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
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
          <div>
            <Label htmlFor="reg-email">Email</Label>
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
            {busy ? "A criar conta…" : "Criar minha conta"}
          </Button>
        </form>
        <div className="my-5 h-px bg-border" />
        <SocialButtons callbackURL="/dashboard" />
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
