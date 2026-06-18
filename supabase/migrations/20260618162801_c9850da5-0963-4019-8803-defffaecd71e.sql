-- Allow owners and managers to assign/revoke roles
CREATE POLICY "Managers manage roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_owner(auth.uid()));

CREATE POLICY "Managers delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_manager_or_owner(auth.uid()));

CREATE POLICY "Managers update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_manager_or_owner(auth.uid()))
WITH CHECK (public.is_manager_or_owner(auth.uid()));