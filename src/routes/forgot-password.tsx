import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthFrame } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";
import { pageTitle } from "@/lib/brand";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: pageTitle("Recuperar palavra-passe") }] }),
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
      <h1 className="text-3xl">Esqueceu a palavra-passe?</h1>
      <p className="mt-1 text-sm text-muted">
        Indique o seu e-mail. Se a conta existir, enviamos uma ligação para redefinir a palavra-passe.
      </p>
      <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <Label htmlFor="forgot-email">E-mail</Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nome@email.com"
          />
        </div>
        <Button className="w-full" size="lg">
          Enviar ligação
        </Button>
      </form>
      <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary">
        Voltar a entrar
      </Link>
    </AuthFrame>
  );
}