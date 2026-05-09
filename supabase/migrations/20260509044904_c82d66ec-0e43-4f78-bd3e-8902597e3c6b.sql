
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.order_status AS ENUM ('pending', 'sent_whatsapp', 'paid', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX product_images_product_idx ON public.product_images(product_id);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, size)
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX product_variants_product_idx ON public.product_variants(product_id);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX orders_user_idx ON public.orders(user_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admins read all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- products (public read, admin write)
CREATE POLICY "anyone reads active products" ON public.products
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- product_images
CREATE POLICY "anyone reads product images" ON public.product_images
  FOR SELECT USING (true);
CREATE POLICY "admins manage product images" ON public.product_images
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- product_variants
CREATE POLICY "anyone reads variants" ON public.product_variants
  FOR SELECT USING (true);
CREATE POLICY "admins manage variants" ON public.product_variants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- orders
CREATE POLICY "users read own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins read all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
-- inserts go through place_order() (SECURITY DEFINER), no direct INSERT policy needed

-- order_items
CREATE POLICY "users read own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "admins read all order items" ON public.order_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============ PLACE ORDER (atomic stock decrement) ============
CREATE OR REPLACE FUNCTION public.place_order(items JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_total INTEGER := 0;
  it JSONB;
  v_variant RECORD;
  v_qty INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF jsonb_array_length(items) = 0 THEN
    RAISE EXCEPTION 'Empty cart';
  END IF;

  -- Lock all variants & validate stock
  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    v_qty := (it->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT pv.id, pv.stock, pv.size, p.name, p.price_cents, p.active
      INTO v_variant
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
     WHERE pv.id = (it->>'variant_id')::UUID
     FOR UPDATE OF pv;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant not found';
    END IF;
    IF NOT v_variant.active THEN
      RAISE EXCEPTION 'Product unavailable';
    END IF;
    IF v_variant.stock < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_variant.name;
    END IF;

    v_total := v_total + (v_variant.price_cents * v_qty);
  END LOOP;

  INSERT INTO public.orders (user_id, total_cents, status)
  VALUES (v_user_id, v_total, 'pending')
  RETURNING id INTO v_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(items) LOOP
    v_qty := (it->>'quantity')::INTEGER;

    SELECT pv.id, pv.stock, pv.size, p.name, p.price_cents
      INTO v_variant
      FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
     WHERE pv.id = (it->>'variant_id')::UUID;

    INSERT INTO public.order_items (order_id, variant_id, product_name, size, unit_price_cents, quantity)
    VALUES (v_order_id, v_variant.id, v_variant.name, v_variant.size, v_variant.price_cents, v_qty);

    UPDATE public.product_variants
       SET stock = stock - v_qty
     WHERE id = v_variant.id;
  END LOOP;

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_order_whatsapp_sent(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
     SET status = 'sent_whatsapp', whatsapp_sent_at = now()
   WHERE id = _order_id AND user_id = auth.uid();
END;
$$;

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "admins upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
