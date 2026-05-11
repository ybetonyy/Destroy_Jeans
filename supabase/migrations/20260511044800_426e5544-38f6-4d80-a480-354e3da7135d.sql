-- Fix restrictive role policies so they do not affect reads
DROP POLICY IF EXISTS "no self role assignment" ON public.user_roles;
DROP POLICY IF EXISTS "only admins write roles" ON public.user_roles;

-- Keep direct execution of internal role checker blocked from clients
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

-- Admins may add roles only for other users
CREATE POLICY "admins insert roles for others"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  user_id <> auth.uid()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admins may update roles only for other users
CREATE POLICY "admins update roles for others"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  user_id <> auth.uid()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  user_id <> auth.uid()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Admins may delete roles only for other users
CREATE POLICY "admins delete roles for others"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (
  user_id <> auth.uid()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);