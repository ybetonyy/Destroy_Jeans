# Destroy Jeans — E-commerce + Admin

Replicar o visual do site atual (preto/grid/vermelho neon, tipografia serifada para "JEANS", "DESTROY" em vermelho com glow) e adicionar backend completo.

## 1. Backend (Lovable Cloud)

Habilitar Lovable Cloud. Tabelas:

- `profiles` — `id` (FK auth.users), `full_name`, `phone`, `created_at`. Trigger auto-cria no signup.
- `user_roles` — `user_id`, `role` (`admin` | `customer`). Função `has_role()` SECURITY DEFINER (anti-recursão RLS).
- `products` — `id`, `name`, `slug`, `description`, `price_cents`, `active`, `created_at`, `updated_at`.
- `product_images` — `id`, `product_id`, `url`, `position`.
- `product_variants` — `id`, `product_id`, `size` (P/M/G/GG/etc), `stock` (int). Esgotamento por quantidade.
- `orders` — `id`, `user_id`, `total_cents`, `status` (`pending`/`sent_whatsapp`/`paid`/`cancelled`), `whatsapp_sent_at`, `created_at`.
- `order_items` — `id`, `order_id`, `variant_id`, `product_name` (snapshot), `size`, `unit_price_cents`, `quantity`.

Storage: bucket público `product-images` para upload de fotos.

## 2. RLS (sem vulnerabilidades)

- `products`, `product_images`, `product_variants`: SELECT público (apenas `active=true` para não-admin); INSERT/UPDATE/DELETE só admin via `has_role(auth.uid(),'admin')`.
- `profiles`: usuário lê/edita o próprio; admin lê todos.
- `user_roles`: usuário lê os próprios; só admin altera (impede privilege escalation).
- `orders`/`order_items`: cliente lê/cria os próprios; admin lê/edita todos.
- Storage `product-images`: leitura pública; upload/delete só admin.
- Decremento de estoque feito por **função SECURITY DEFINER** `place_order()` que valida estoque, cria order + items e debita variants atomicamente — cliente nunca escreve direto em `product_variants`.

## 3. Auth

Email + senha (signup/login/logout). Páginas `/login`, `/cadastro`. Listener `onAuthStateChange` antes de `getSession`. Validação Zod nos formulários. Primeiro admin promovido via SQL manual (instrução exibida ao usuário).

## 4. Rotas (TanStack)

Públicas:
- `/` — hero "DESTROY JEANS" + grid de produtos ativos (Archive Collection).
- `/produto/$slug` — galeria, descrição, seleção de tamanho (desabilita esgotados), botão "Adicionar ao carrinho".
- `/carrinho` — itens, quantidades, total, botão "Finalizar via WhatsApp".
- `/login`, `/cadastro`.

Cliente (`_authenticated/`):
- `/conta/pedidos` — histórico.

Admin (`_authenticated/_admin/`, gate via `has_role`):
- `/admin` — dashboard (total de produtos, pedidos do mês, receita, estoque baixo).
- `/admin/produtos` — listar/criar/editar/remover. Form com nome, descrição (textarea), preço, upload múltiplo de imagens, variantes (tamanho + estoque).
- `/admin/pedidos` — lista, detalhe, mudar status.

## 5. Carrinho + Checkout WhatsApp

Carrinho em Zustand persistido (localStorage). Checkout: cria `order` + `order_items` via `place_order()` (debita estoque), depois abre `https://wa.me/<numero>?text=<resumo do pedido>` com `encodeURIComponent`. Número do WhatsApp configurável (pergunto ao usuário ou deixo placeholder editável no admin).

## 6. Design system

Tokens em `src/styles.css` (oklch): `--background` preto, `--primary` vermelho neon (`oklch(0.55 0.22 27)`), `--primary-glow`, gradiente de fundo com grid sutil (CSS background), fonte serifada (Playfair Display) para títulos + Inter para corpo. Variantes de Button (`hero`, `outlineNeon`). Glow via `box-shadow`/`text-shadow` de tokens.

## 7. Detalhes técnicos

- Server functions (`createServerFn` + `requireSupabaseAuth`) para mutations admin e `place_order`.
- Validação Zod client + server.
- Upload imagens: client browser supabase → bucket → salvar URLs em `product_images`.
- Sem `dangerouslySetInnerHTML`. Sanitização de textos. Limites de tamanho em todos os campos.

## Pergunta única antes de começar

Vou usar `+55 11 99999-9999` como WhatsApp placeholder — você troca depois pelo seu número real direto numa setting do admin. OK?
