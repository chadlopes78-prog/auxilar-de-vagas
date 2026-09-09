import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { AuthSplash } from "@/components/require-auth";
import { Shell } from "@/components/site-header";
import { DashShell, DashPage } from "@/components/dash-nav";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-profile";
import { updateProfile } from "@/lib/server/account";
import { toast } from "sonner";

export const Route = createFileRoute("/employer/company")({ component: CompanyForm });

function CompanyForm() {
  const { profile, loading, user, isPending } = useProfile();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [size, setSize] = useState("11-50");
  if (isPending) return <AuthSplash />;
  if (!user) return <RedirectToSignIn />;
  if (loading) return <AuthSplash />;
  return (
    <Shell>
      <DashShell profile={profile} active="/employer/company">
        <DashPage title="Perfil da empresa">
        <div className="mt-4 space-y-3 dash-card p-5">
          <div>
            <Label>Nome da empresa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Sector</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Sítio web</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div>
            <Label>Dimensão da empresa</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              await updateProfile({
                data: {
                  role: "employer",
                  companyName: name,
                  companyIndustry: industry,
                  companyDescription: description,
                  companyWebsite: website,
                  companySize: size,
                },
              });
              toast.success("Empresa guardada");
            }}
          >
            Guardar empresa
          </Button>
        </div>
        </DashPage>
      </DashShell>
    </Shell>
  );
}
