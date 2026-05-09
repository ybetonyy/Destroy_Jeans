import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const count = useCart((s) => s.count());
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold text-primary text-glow">DESTROY</span>
          <span className="font-serif text-2xl font-bold text-foreground">JEANS</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
            activeProps={{ className: "text-primary" }}
            activeOptions={{ exact: true }}
          >
            Catálogo
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              <LayoutDashboard className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/carrinho" aria-label="Carrinho">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-glow">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          {user ? (
            <>
              <Button asChild variant="ghost" size="icon">
                <Link to="/conta/pedidos" aria-label="Minha conta">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
              <Button asChild variant="default" size="sm" className="shadow-glow">
                <Link to="/cadastro">Cadastrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
