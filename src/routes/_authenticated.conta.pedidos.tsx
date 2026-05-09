import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/conta/pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — Destroy Jeans" }] }),
  component: MyOrders,
});

function MyOrders() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_cents, status, created_at, order_items(product_name, size, quantity, unit_price_cents)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 font-serif text-4xl">Meus pedidos</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !data || data.length === 0 ? (
        <p className="text-muted-foreground">Nenhum pedido ainda.</p>
      ) : (
        <ul className="space-y-4">
          {data.map((o) => (
            <li key={o.id} className="border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="border border-primary px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                    {o.status}
                  </span>
                  <p className="mt-1 font-serif text-lg text-primary">{formatBRL(o.total_cents)}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                {o.order_items.map((it, i) => (
                  <li key={i} className="flex justify-between text-muted-foreground">
                    <span>{it.product_name} (Tam {it.size}) x{it.quantity}</span>
                    <span>{formatBRL(it.unit_price_cents * it.quantity)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
