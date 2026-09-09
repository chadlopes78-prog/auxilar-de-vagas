import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { GuestOnly } from "@/components/require-auth";
import { ensureProfile, updateProfile } from "@/lib/server/account";
import { useLocationStore } from "@/store/location";
import { APP_MARK, APP_NAME } from "@/lib/brand";
import { toast } from "sonner";
import { SUPPORT_LOGIN_TEXT, supportUrl, WhatsAppIcon } from "@/components/support-whatsapp";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <GuestOnly>
      <div className="auth-stage flex min-h-dvh flex-col items-center justify-center px-4 py-8">
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
          className="wa-pulse auth-enter auth-enter-4 relative z-10 mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-4 text-sm font-medium text-whatsapp-fg transition-transform duration-150 hover:brightness-105 active:scale-[0.96]"
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

function SocialButtons({ callbackURL }: { callbackURL: string }) {
  if (!authEnabled) {
    return <p className="text-sm text-muted">O início de sessão está desactivado.</p>;
  }
  return (
    <div className="space-y-2">
      {GROK_PROVIDERS.map((p) => (
        <Button
          key={p.providerId}
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => signIn(p.providerId, { callbackURL })}
        >
          Continuar com {p.label}
        </Button>
      ))}
    </div>
  );
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (err) {
      const message = err.message ?? "Email ou palavra-passe incorrectos.";
      setError(message);
      toast.error(message);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-6 sm:p-8">
        <ModeTabs mode="login" />
        <h1 className="text-3xl text-fg">Bem-vindo de volta</h1>
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
  const navigate = useNavigate();
  const loc = useLocationStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setBusy(true);
    const { error: err } = await authClient.signUp.email({ email, password, name: fullName });
    if (err) {
      setBusy(false);
      const message = err.message ?? "Não foi possível criar a conta.";
      setError(message);
      toast.error(message);
      return;
    }
    try {
      const created = await ensureProfile({ data: { email, name: fullName } });
      await updateProfile({
        data: {
          role: "candidate",
          fullName,
          email,
          countryId: loc.countryId || 1,
          regionId: loc.regionId || null,
          cityId: loc.cityId || null,
        },
      });
      toast.success(
        created.welcomeEmailSent
          ? "Conta criada. Enviámos um e-mail de boas-vindas."
          : "Conta criada com sucesso.",
      );
    } catch {
      /* profile is created on the dashboard if this fails */
    }
    setBusy(false);
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-6 sm:p-8">
        <ModeTabs mode="register" />
        <h1 className="text-3xl text-fg">Criar a sua conta</h1>
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
