import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/format";
import { Trash2, Plus, Upload, X } from "lucide-react";

export type ProductFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  priceBRL?: string;
  active?: boolean;
  images?: { id?: string; url: string; position: number }[];
  variants?: { id?: string; size: string; stock: number }[];
};

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug inválido"),
  description: z.string().max(2000),
  priceCents: z.number().int().min(0).max(10_000_000),
  active: z.boolean(),
});

export function ProductForm({ initial }: { initial?: ProductFormInitial }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!initial?.id;

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceBRL, setPriceBRL] = useState(initial?.priceBRL ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [images, setImages] = useState(initial?.images ?? []);
  const [variants, setVariants] = useState(
    initial?.variants ?? [{ size: "P", stock: 0 }],
  );
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!isEdit && name && !slug) setSlug(slugify(name));
  }, [name, slug, isEdit]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: máximo 5MB`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file);
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        setImages((imgs) => [...imgs, { url: data.publicUrl, position: imgs.length }]);
      }
    } finally {
      setUploading(false);
    }
  };

  // Convert Google Drive share links to direct image URLs
  const normalizeImageUrl = (raw: string): string => {
    const url = raw.trim();
    // https://drive.google.com/file/d/FILE_ID/view?usp=...
    const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`;
    // https://drive.google.com/open?id=FILE_ID
    const m2 = url.match(/[?&]id=([^&]+)/);
    if (m2 && url.includes("drive.google.com")) {
      return `https://drive.google.com/uc?export=view&id=${m2[1]}`;
    }
    return url;
  };

  const addImageByUrl = () => {
    if (!imageUrl.trim()) return;
    try {
      const normalized = normalizeImageUrl(imageUrl);
      // basic URL validation
      new URL(normalized);
      setImages((imgs) => [...imgs, { url: normalized, position: imgs.length }]);
      setImageUrl("");
    } catch {
      toast.error("URL inválida");
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const cents = Math.round(parseFloat(priceBRL.replace(",", ".") || "0") * 100);
      const parsed = schema.safeParse({
        name, slug, description, priceCents: cents, active,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (variants.length === 0) throw new Error("Adicione ao menos um tamanho");
      for (const v of variants) {
        if (!v.size.trim()) throw new Error("Tamanho não pode ser vazio");
        if (v.stock < 0 || v.stock > 9999) throw new Error("Estoque inválido");
      }

      let productId = initial?.id;
      if (productId) {
        const { error } = await supabase
          .from("products")
          .update({
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description,
            price_cents: parsed.data.priceCents,
            active: parsed.data.active,
          })
          .eq("id", productId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            name: parsed.data.name,
            slug: parsed.data.slug,
            description: parsed.data.description,
            price_cents: parsed.data.priceCents,
            active: parsed.data.active,
          })
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // Replace images
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (images.length > 0) {
        const { error } = await supabase.from("product_images").insert(
          images.map((img, i) => ({ product_id: productId!, url: img.url, position: i })),
        );
        if (error) throw error;
      }

      // Replace variants
      await supabase.from("product_variants").delete().eq("product_id", productId);
      const { error: vErr } = await supabase.from("product_variants").insert(
        variants.map((v) => ({
          product_id: productId!,
          size: v.size.trim().toUpperCase(),
          stock: Math.floor(v.stock),
        })),
      );
      if (vErr) throw vErr;

      return productId;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Produto atualizado" : "Produto criado");
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products", "active"] });
      navigate({ to: "/admin/produtos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      className="max-w-2xl space-y-6"
    >
      <h2 className="font-serif text-3xl">{isEdit ? "Editar produto" : "Novo produto"}</h2>

      <div className="space-y-4 border border-border bg-card p-5">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} maxLength={100} required />
        </div>
        <div>
          <Label htmlFor="desc">Descrição</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={5} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Preço (R$)</Label>
            <Input id="price" inputMode="decimal" value={priceBRL} onChange={(e) => setPriceBRL(e.target.value)} placeholder="299,90" required />
          </div>
          <div className="flex items-end gap-2">
            <input id="active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-primary" />
            <Label htmlFor="active">Ativo (visível na loja)</Label>
          </div>
        </div>
      </div>

      {/* IMAGES */}
      <div className="space-y-3 border border-border bg-card p-5">
        <Label>Imagens</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={img.url} className="group relative aspect-[3/4] overflow-hidden border border-border bg-muted">
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImages((arr) => arr.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 rounded bg-background/80 p-1 opacity-0 transition group-hover:opacity-100"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-border bg-muted text-xs text-muted-foreground hover:border-primary hover:text-primary">
            <Upload className="h-5 w-5" />
            {uploading ? "Enviando..." : "Adicionar"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">JPG/PNG até 5MB cada. A primeira imagem é a capa.</p>

        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Cole URL (Google Drive, etc)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addImageByUrl();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addImageByUrl}>
            <Plus className="mr-1 h-3 w-3" /> URL
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Para Google Drive: clique direito no arquivo → Compartilhar → "Qualquer pessoa com o link" e cole aqui.
        </p>
      </div>

      {/* VARIANTS */}
      <div className="space-y-3 border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <Label>Tamanhos e estoque</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVariants((v) => [...v, { size: "", stock: 0 }])}
          >
            <Plus className="mr-1 h-3 w-3" /> tamanho
          </Button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Tamanho (P/M/G...)"
              value={v.size}
              onChange={(e) => {
                const val = e.target.value;
                setVariants((arr) => arr.map((x, idx) => (idx === i ? { ...x, size: val } : x)));
              }}
              maxLength={10}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={9999}
              placeholder="Estoque"
              value={v.stock}
              onChange={(e) => {
                const n = parseInt(e.target.value || "0", 10);
                setVariants((arr) => arr.map((x, idx) => (idx === i ? { ...x, stock: n } : x)));
              }}
              className="w-28"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setVariants((arr) => arr.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending} className="shadow-glow">
          {save.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate({ to: "/admin/produtos" })}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
