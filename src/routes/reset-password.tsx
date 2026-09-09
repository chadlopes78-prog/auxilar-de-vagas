import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthFrame } from "@/components/auth-screen";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Redefinir palavra-passe | Auxilar de Vagas" }] }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authClient.resetPassword({ newPassword: password });
      toast.success("Palavra-passe atualizada. Já pode entrar.");
      navigate({ to: "/login" });
    } catch {
      toast.error("Ligação inválida ou expirada.");
    }
  }
  return (
    <AuthFrame>
      <div className="auth-card auth-enter auth-enter-2 w-full max-w-[420px] p-6 sm:p-8">
        <h1 className="text-3xl">Redefinir palavra-passe</h1>
        <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <Label htmlFor="new-password">Nova palavra-passe</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button className="btn-shine w-full" size="lg">
            Atualizar palavra-passe
          </Button>
        </form>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </AuthFrame>
  );
}
