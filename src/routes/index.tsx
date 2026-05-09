import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Destroy Jeans — Archive Catalog" },
      {
        name: "description",
        content: "Peças destroyed, rasgadas e reconstruídas. Cada uma conta uma história.",
      },
    ],
  }),
  component: Index,
});

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  product_images: { url: string; position: number }[];
  product_variants: { stock: number }[];
};

function Index() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price_cents, product_images(url, position), product_variants(stock)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  return (
    <main>
      {/* HERO */}
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-4 py-24 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-primary">Est. 2025</p>
        <h1 className="font-serif text-6xl font-black leading-none md:text-8xl">
          <span className="block text-primary text-glow">DESTROY</span>
          <span className="block text-foreground">JEANS</span>
        </h1>
        <p className="mt-8 max-w-xl text-base text-muted-foreground md:text-lg">
          Cada peça conta uma história. Destroyed, rasgado, reconstruído. Para quem não segue
          tendências, mas as cria.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="shadow-glow">
            <a href="#colecao">Ver Coleção</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/carrinho">Meu Carrinho</Link>
          </Button>
        </div>
      </section>

      {/* COLLECTION */}
      <section id="colecao" className="border-t border-border bg-background/40 px-4 py-20">
        <div className="container mx-auto">
          <div className="mb-12">
            <h2 className="font-serif text-4xl">
              <span className="text-primary">Archive</span>{" "}
              <span className="text-foreground">Collection</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Peças únicas selecionadas para você
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse bg-muted" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const totalStock = p.product_variants.reduce((s, v) => s + v.stock, 0);
                const img = [...p.product_images].sort((a, b) => a.position - b.position)[0]?.url;
                return (
                  <ProductCard
                    key={p.id}
                    slug={p.slug}
                    name={p.name}
                    priceCents={p.price_cents}
                    imageUrl={img}
                    soldOut={totalStock === 0}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Novos produtos em breve. Fique ligado.
              </p>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        © 2025 Destroy Jeans. Archive Catalog.
        {/* FOOTER */}
<footer className="border-t border-border mt-20">
  <div className="container mx-auto px-4 py-10 flex flex-col items-center gap-4 text-center">
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
      <a
        href="tel:+5515991913942"
        className="hover:text-foreground transition-colors"
      >
        📞 +55 15 99191-3942
      </a>
      <a
        href="mailto:hikef005@gmail.com"
        className="hover:text-foreground transition-colors"
      >
        ✉️ hikef005@gmail.com
      </a>
    </div>
    <p className="text-xs text-muted-foreground">
      © 2025 Destroy Jeans. Archive Catalog.
    </p>
  </div>
</footer>

      </footer>
    </main>
  );
}
