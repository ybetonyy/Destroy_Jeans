import { Link } from "@tanstack/react-router";
import { formatBRL } from "@/lib/format";

type Props = {
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string;
  soldOut?: boolean;
};

export function ProductCard({ slug, name, priceCents, imageUrl, soldOut }: Props) {
  return (
    <Link
      to="/produto/$slug"
      params={{ slug }}
      className="group block overflow-hidden border border-border bg-card transition hover:border-primary hover:shadow-glow"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            sem imagem
          </div>
        )}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="border border-primary px-3 py-1 text-xs uppercase tracking-widest text-primary">
              esgotado
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="font-serif text-lg text-foreground">{name}</h3>
        <p className="text-sm text-primary">{formatBRL(priceCents)}</p>
      </div>
    </Link>
  );
}
