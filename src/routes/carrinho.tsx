import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Minus, Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

const WHATSAPP_NUMBER = "5515991913942";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho — Destroy Jeans" }] }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.totalCents());

  const checkout = () => {
    if (items.length === 0) return;
    const lines = items.map(
      (i) => `• ${i.productName} (Tam ${i.size}) x${i.quantity} — ${formatBRL(i.unitPriceCents * i.quantity)}`,
    );
    const msg = [
      `*Novo pedido — Destroy Jeans*`,
      ``,
      ...lines,
      ``,
      `*Total: ${formatBRL(total)}*`,
    ].join("\n");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.success("Redirecionando ao WhatsApp...");
    clear();
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 font-serif text-4xl">Carrinho</h1>

      {items.length === 0 ? (
        <div className="border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Seu carrinho está vazio.</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/">Ver coleção</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-4 border border-border bg-card p-4">
                <div className="h-24 w-20 flex-shrink-0 overflow-hidden bg-muted">
                  {i.imageUrl && <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1">
                  <Link to="/produto/$slug" params={{ slug: i.slug }} className="font-serif text-lg hover:text-primary">
                    {i.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground">Tamanho {i.size}</p>
                  <p className="mt-1 text-sm text-primary">{formatBRL(i.unitPriceCents)}</p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center border border-border">
                      <button
                        className="px-2 py-1 hover:bg-accent"
                        onClick={() => setQty(i.variantId, i.quantity - 1)}
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm">{i.quantity}</span>
                      <button
                        className="px-2 py-1 hover:bg-accent disabled:opacity-30"
                        onClick={() => setQty(i.variantId, i.quantity + 1)}
                        disabled={i.quantity >= i.maxStock}
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(i.variantId)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm">{formatBRL(i.unitPriceCents * i.quantity)}</div>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center justify-between text-lg">
              <span className="text-muted-foreground">Total</span>
              <span className="font-serif text-2xl text-primary">{formatBRL(total)}</span>
            </div>
            <Button
              onClick={checkout}
              size="lg"
              className="mt-6 w-full shadow-glow"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Finalizar via WhatsApp
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
