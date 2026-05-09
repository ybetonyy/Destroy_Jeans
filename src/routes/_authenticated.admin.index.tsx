import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }] }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, lowStock] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_cents, created_at"),
        supabase.from("product_variants").select("id, size, stock, products(name)").lte("stock", 2),
      ]);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthOrders = (orders.data ?? []).filter((o) => new Date(o.created_at) >= monthStart);
      return {
        productCount: products.count ?? 0,
        ordersCount: monthOrders.length,
        revenue: monthOrders.reduce((s, o) => s + o.total_cents, 0),
        lowStock: lowStock.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Package} label="Produtos" value={String(data?.productCount ?? "—")} />
        <Stat icon={ShoppingCart} label="Pedidos no mês" value={String(data?.ordersCount ?? "—")} />
        <Stat icon={DollarSign} label="Receita do mês" value={data ? formatBRL(data.revenue) : "—"} />
      </div>

      <div className="border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <h3 className="font-serif text-lg">Estoque baixo</h3>
        </div>
        {!data || data.lowStock.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma variante com estoque baixo.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {data.lowStock.map((v: any) => (
              <li key={v.id} className="flex justify-between py-2">
                <span>{v.products?.name} — Tam {v.size}</span>
                <span className={v.stock === 0 ? "text-destructive" : "text-primary"}>
                  {v.stock} unid.
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
