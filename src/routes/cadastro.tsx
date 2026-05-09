import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — Destroy Jeans" }] }),
  component: SignupPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail (se necessário) e faça login.");
    navigate({ to: "/login" });
  };

  return (
    <main className="container mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="mb-2 font-serif text-4xl text-foreground">Criar conta</h1>
      <p className="mb-8 text-sm text-muted-foreground">Junte-se ao archive</p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={72} autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full shadow-glow" disabled={loading}>
          {loading ? "Criando..." : "Cadastrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
