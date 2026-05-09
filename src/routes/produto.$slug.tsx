import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/store/cart";
import { ChevronLeft, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5515991913942";

export const Route = createFileRoute("/produto/$slug")({
  component: ProductPage,
});

type Variant = { id: string; size: string; stock: number };

function ProductPage() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, price_cents, active, product_images(url, position), product_variants(id, size, stock)",
        )
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <main className="container mx-auto px-4 py-20 text-center">Carregando...</main>;
  }
  if (!data) {
    return (
      <main className="container mx-auto px-4 py-20 text-center">
        <p>Produto não encontrado.</p>
        <Button asChild variant="link"><Link to="/">Voltar à coleção</Link></Button>
      </main>
    );
  }

  const images = [...data.product_images].sort((a, b) => a.position - b.position);
  const variants = (data.product_variants as Variant[]).sort((a, b) => a.size.localeCompare(b.size));
  const current = variants.find((v) => v.id === selectedVariant);
  const canAdd = current && current.stock > 0;

  const handleAdd = () => {
    if (!current) {
      toast.error("Selecione um tamanho");
      return;
    }
    if (current.stock <= 0) {
      toast.error("Tamanho esgotado");
      return;
    }
    add({
      variantId: current.id,
      productId: data.id,
      productName: data.name,
      slug: data.slug,
      size: current.size,
      unitPriceCents: data.price_cents,
      imageUrl: images[0]?.url,
      maxStock: current.stock,
      quantity: 1,
    });
    toast.success("Adicionado ao carrinho");
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> voltar
      </Link>

      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <div className="aspect-[3/4] overflow-hidden border border-border bg-muted">
            {images[imgIdx] ? (
              <img src={images[imgIdx].url} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">sem imagem</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  onClick={() => setImgIdx(i)}
                  className={`h-20 w-16 flex-shrink-0 overflow-hidden border ${i === imgIdx ? "border-primary" : "border-border"}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-serif text-4xl text-foreground">{data.name}</h1>
          <p className="mt-2 text-2xl text-primary">{formatBRL(data.price_cents)}</p>

          {data.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          )}

          <div className="mt-8">
            <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Tamanho</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => {
                const out = v.stock <= 0;
                const active = selectedVariant === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => !out && setSelectedVariant(v.id)}
                    disabled={out}
                    className={`min-w-14 border px-4 py-2 text-sm transition ${
                      out
                        ? "cursor-not-allowed border-border text-muted-foreground line-through opacity-50"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-glow"
                          : "border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {v.size}
                  </button>
                );
              })}
              {variants.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem variantes cadastradas.</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!canAdd}
            size="lg"
            className="mt-8 w-full shadow-glow"
          >
            {canAdd ? "Adicionar ao carrinho" : current ? "Esgotado" : "Selecione um tamanho"}
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="mt-3 w-full"
          >
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Olá! Tenho interesse no produto *${data.name}*${current ? ` (Tam ${current.size})` : ""} — ${formatBRL(data.price_cents)}\n${typeof window !== "undefined" ? window.location.href : ""}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Comprar via WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
