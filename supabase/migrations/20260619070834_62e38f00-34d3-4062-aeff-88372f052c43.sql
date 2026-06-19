
-- 1) Create private schema for internal RLS helpers (not exposed by Data API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2) Recreate helper functions in `private` schema
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) $$;

CREATE OR REPLACE FUNCTION private.is_manager_or_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','manager')) $$;

-- Lock down EXECUTE: only authenticated can call (needed for RLS), no anon/public
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_manager_or_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_manager_or_owner(uuid) TO authenticated, service_role;

-- 3) Recreate every policy that referenced public.has_role/is_staff/is_manager_or_owner
--    to reference the private.* versions instead.

-- audit_logs: ADD is_staff check on INSERT (fixes log-poisoning finding)
DROP POLICY IF EXISTS "Staff create audit" ON public.audit_logs;
CREATE POLICY "Staff create audit" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view audit" ON public.audit_logs;
CREATE POLICY "Staff view audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- inventory_movements
DROP POLICY IF EXISTS "Staff insert movements" ON public.inventory_movements;
CREATE POLICY "Staff insert movements" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Staff view movements" ON public.inventory_movements;
CREATE POLICY "Staff view movements" ON public.inventory_movements
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- pharmacy_settings
DROP POLICY IF EXISTS "Managers insert settings" ON public.pharmacy_settings;
CREATE POLICY "Managers insert settings" ON public.pharmacy_settings
  FOR INSERT TO authenticated WITH CHECK (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Managers update settings" ON public.pharmacy_settings;
CREATE POLICY "Managers update settings" ON public.pharmacy_settings
  FOR UPDATE TO authenticated
  USING (private.is_manager_or_owner(auth.uid()))
  WITH CHECK (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Staff can view settings" ON public.pharmacy_settings;
CREATE POLICY "Staff can view settings" ON public.pharmacy_settings
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- products
DROP POLICY IF EXISTS "Managers insert products" ON public.products;
CREATE POLICY "Managers insert products" ON public.products
  FOR INSERT TO authenticated WITH CHECK (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Managers update products" ON public.products;
CREATE POLICY "Managers update products" ON public.products
  FOR UPDATE TO authenticated USING (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Owners delete products" ON public.products;
CREATE POLICY "Owners delete products" ON public.products
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Staff view products" ON public.products;
CREATE POLICY "Staff view products" ON public.products
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Managers update any profile" ON public.profiles;
CREATE POLICY "Managers update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- suppliers
DROP POLICY IF EXISTS "Managers manage suppliers" ON public.suppliers;
CREATE POLICY "Managers manage suppliers" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Managers update suppliers" ON public.suppliers;
CREATE POLICY "Managers update suppliers" ON public.suppliers
  FOR UPDATE TO authenticated USING (private.is_manager_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Owners delete suppliers" ON public.suppliers;
CREATE POLICY "Owners delete suppliers" ON public.suppliers
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Staff view suppliers" ON public.suppliers;
CREATE POLICY "Staff view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- sales
DROP POLICY IF EXISTS "Staff create sales" ON public.sales;
CREATE POLICY "Staff create sales" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) AND cashier_id = auth.uid());

DROP POLICY IF EXISTS "Staff view sales" ON public.sales;
CREATE POLICY "Staff view sales" ON public.sales
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- sale_items
DROP POLICY IF EXISTS "Staff create sale items" ON public.sale_items;
CREATE POLICY "Staff create sale items" ON public.sale_items
  FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff view sale items" ON public.sale_items;
CREATE POLICY "Staff view sale items" ON public.sale_items
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- user_roles: STRENGTHEN — prevent self-assignment, even by managers/owners.
DROP POLICY IF EXISTS "Managers manage roles" ON public.user_roles;
CREATE POLICY "Managers manage roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.is_manager_or_owner(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Managers update roles" ON public.user_roles;
CREATE POLICY "Managers update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.is_manager_or_owner(auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (private.is_manager_or_owner(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Managers delete roles" ON public.user_roles;
CREATE POLICY "Managers delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.is_manager_or_owner(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Staff can view roles" ON public.user_roles;
CREATE POLICY "Staff can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));

-- 4) Update handle_new_user trigger to use the private functions and continue
--    to seed the very first user as owner via SECURITY DEFINER (bypasses RLS).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE is_first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first_user;
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END; $$;

-- 5) Drop the old public helper functions now that nothing references them
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
DROP FUNCTION IF EXISTS public.is_manager_or_owner(uuid);
