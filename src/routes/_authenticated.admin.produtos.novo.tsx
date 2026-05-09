import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/ProductForm";

export const Route = createFileRoute("/_authenticated/admin/produtos/novo")({
  head: () => ({ meta: [{ title: "Novo produto — Admin" }] }),
  component: () => <ProductForm />,
});
