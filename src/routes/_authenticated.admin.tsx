import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, ShoppingCart } from "lucide-react";
import { isAllowedAdminEmail } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    if (!isAllowedAdminEmail(session.user.email)) throw redirect({ to: "/" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
    { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart, exact: false },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
        <span className="font-serif text-xs uppercase tracking-widest text-primary">Admin</span>
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_1fr]">
        <nav className="space-y-1">
          {items.map((it) => {
            const active = it.exact ? path === it.to : path.startsWith(it.to);
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 border-l-2 px-3 py-2 text-sm transition ${
                  active
                    ? "border-primary bg-accent text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div><Outlet /></div>
      </div>
    </div>
  );
}
