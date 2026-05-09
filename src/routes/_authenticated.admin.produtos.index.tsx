import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — Admin" }] }),
  component: ProductList,
});

function ProductList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price_cents, active, product_images(url, position), product_variants(stock)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-3xl">Produtos</h2>
        <Button asChild className="shadow-glow">
          <Link to="/admin/produtos/novo">
            <Plus className="mr-1 h-4 w-4" /> Novo
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !data || data.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center text-muted-foreground">
          Nenhum produto cadastrado. Clique em "Novo" para começar.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.map((p) => {
            const totalStock = p.product_variants.reduce((s, v) => s + v.stock, 0);
            const img = [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url;
            return (
              <li key={p.id} className="flex items-center gap-4 border border-border bg-card p-3">
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden bg-muted">
                  {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-serif text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(p.price_cents)} · {totalStock} em estoque ·{" "}
                    {p.active ? "ativo" : "inativo"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
                  title={p.active ? "Desativar" : "Ativar"}
                >
                  {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <Link to="/admin/produtos/$id" params={{ id: p.id }}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Remover "${p.name}"?`)) remove.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
