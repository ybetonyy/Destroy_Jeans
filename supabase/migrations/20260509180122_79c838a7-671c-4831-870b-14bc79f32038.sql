
-- 1) Lock down SECURITY DEFINER functions: revoke from public/anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_order(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_order_whatsapp_sent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_whatsapp_sent(uuid) TO authenticated;

-- 2) Ensure search_path is set on every SECURITY DEFINER function
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- 3) Storage: drop the broad SELECT policy that lets anyone LIST all files,
-- replace with one that only admins can list. Public files remain accessible
-- via the public CDN URL (bucket is public) — listing is what we restrict.
DROP POLICY IF EXISTS "public read product images" ON storage.objects;

CREATE POLICY "admins list product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
