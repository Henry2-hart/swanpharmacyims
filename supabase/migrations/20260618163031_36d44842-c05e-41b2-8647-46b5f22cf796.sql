CREATE TABLE public.pharmacy_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  business_name TEXT NOT NULL DEFAULT 'MediStock Pharmacy',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  tax_rate NUMERIC NOT NULL DEFAULT 5,
  receipt_footer TEXT NOT NULL DEFAULT 'Thank you for your purchase!',
  low_stock_threshold INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.pharmacy_settings TO authenticated;
GRANT ALL ON public.pharmacy_settings TO service_role;

ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view settings" ON public.pharmacy_settings
FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Managers update settings" ON public.pharmacy_settings
FOR UPDATE TO authenticated
USING (public.is_manager_or_owner(auth.uid()))
WITH CHECK (public.is_manager_or_owner(auth.uid()));

CREATE POLICY "Managers insert settings" ON public.pharmacy_settings
FOR INSERT TO authenticated
WITH CHECK (public.is_manager_or_owner(auth.uid()));

CREATE TRIGGER pharmacy_settings_updated_at
BEFORE UPDATE ON public.pharmacy_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pharmacy_settings (id) VALUES (true) ON CONFLICT DO NOTHING;