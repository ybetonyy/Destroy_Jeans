import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  head: () => ({ meta: [{ title: "Editar produto — Admin" }] }),
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, description, price_cents, active, product_images(id, url, position), product_variants(id, size, stock)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;
  if (!data) return <p className="text-muted-foreground">Produto não encontrado.</p>;

  return (
    <ProductForm
      initial={{
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? "",
        priceBRL: (data.price_cents / 100).toFixed(2).replace(".", ","),
        active: data.active,
        images: [...data.product_images].sort((a, b) => a.position - b.position),
        variants: [...data.product_variants].sort((a, b) => a.size.localeCompare(b.size)),
      }}
    />
  );
}
