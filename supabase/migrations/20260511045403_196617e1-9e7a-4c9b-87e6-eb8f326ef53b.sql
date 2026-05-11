-- Public, invoker-safe helper for product/admin policies
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::public.app_role
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Products
DROP POLICY IF EXISTS "anyone reads active products" ON public.products;
CREATE POLICY "anyone reads active products"
ON public.products
FOR SELECT
USING (active = true OR public.current_user_is_admin());

DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Product images metadata
DROP POLICY IF EXISTS "admins manage product images" ON public.product_images;
CREATE POLICY "admins manage product images"
ON public.product_images
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Product variants
DROP POLICY IF EXISTS "admins manage variants" ON public.product_variants;
CREATE POLICY "admins manage variants"
ON public.product_variants
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Storage uploads
DROP POLICY IF EXISTS "admins list product images" ON storage.objects;
DROP POLICY IF EXISTS "admins upload product images" ON storage.objects;
DROP POLICY IF EXISTS "admins update product images" ON storage.objects;
DROP POLICY IF EXISTS "admins delete product images" ON storage.objects;

CREATE POLICY "admins list product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-images' AND public.current_user_is_admin());

CREATE POLICY "admins upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND public.current_user_is_admin());

CREATE POLICY "admins update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND public.current_user_is_admin())
WITH CHECK (bucket_id = 'product-images' AND public.current_user_is_admin());

CREATE POLICY "admins delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND public.current_user_is_admin());

-- Admin reads for supporting tables
DROP POLICY IF EXISTS "admins read all profiles" ON public.profiles;
CREATE POLICY "admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admins read all orders" ON public.orders;
CREATE POLICY "admins read all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admins update orders" ON public.orders;
CREATE POLICY "admins update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "admins read all order items" ON public.order_items;
CREATE POLICY "admins read all order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admins read admin_users" ON public.admin_users;
CREATE POLICY "admins read admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admins manage admin_users" ON public.admin_users;
CREATE POLICY "admins manage admin_users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());