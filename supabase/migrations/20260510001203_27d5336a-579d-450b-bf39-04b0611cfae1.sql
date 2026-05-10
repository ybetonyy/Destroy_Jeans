-- 1. Drop unused SECURITY DEFINER functions (no longer called anywhere)
DROP FUNCTION IF EXISTS public.place_order(jsonb);
DROP FUNCTION IF EXISTS public.mark_order_whatsapp_sent(uuid);

-- 2. Lock down has_role: only used by RLS policies (which run as table owner),
-- so revoke direct EXECUTE from clients.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- 3. Hard guard against self-promotion on user_roles:
-- RESTRICTIVE policy that ALWAYS blocks a user from inserting/updating
-- a row where user_id = auth.uid(). Only an admin (different user) can
-- assign roles to others, and even an admin cannot promote themselves.
CREATE POLICY "no self role assignment"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (user_id <> auth.uid())
WITH CHECK (user_id <> auth.uid());

-- 4. Explicit deny: prevent any non-admin from touching user_roles writes.
-- (The existing PERMISSIVE "admins manage roles" already requires admin,
-- but we add a RESTRICTIVE belt-and-suspenders to make intent unambiguous.)
CREATE POLICY "only admins write roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));