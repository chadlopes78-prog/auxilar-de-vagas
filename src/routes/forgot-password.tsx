import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthFrame } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar palavra-passe | Auxilar de Vagas" }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    } catch {
      /* still show success */
    }
    toast.success("Se a conta existir, enviámos uma ligação de recuperação.");
  }
  return (
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="text-3xl">Esqueceu a palavra-passe?</h1>
        <p className="mt-1 text-sm text-muted">
          Indique o seu email. Se a conta existir, enviamos uma ligação para redefinir a palavra-passe.
        </p>
        <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nome@email.com"
            />
          </div>
          <Button className="btn-shine w-full" size="lg">
            Enviar ligação
          </Button>
        </form>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Voltar a entrar
        </Link>
      </div>
    </AuthFrame>
  );
}
