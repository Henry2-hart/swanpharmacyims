
-- 1. Product master fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manufacturer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dosage_form text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS strength text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Archive legacy on-hand quantities; batches own stock now.
UPDATE public.products SET quantity = 0;

-- 2. Stock transaction type enum
DO $$ BEGIN
  CREATE TYPE public.stock_txn_type AS ENUM
    ('purchase','sale','return','damage','expired','adjustment','opening');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. product_batches
CREATE TABLE public.product_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  batch_number text NOT NULL DEFAULT '',
  manufacture_date date,
  expiry_date date,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  initial_quantity integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_batches TO authenticated;
GRANT ALL ON public.product_batches TO service_role;
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view batches" ON public.product_batches
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff insert batches" ON public.product_batches
  FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers update batches" ON public.product_batches
  FOR UPDATE TO authenticated USING (private.is_manager_or_owner(auth.uid()));
CREATE POLICY "Owners delete batches" ON public.product_batches
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX idx_batches_product ON public.product_batches(product_id);
CREATE INDEX idx_batches_expiry ON public.product_batches(expiry_date);

CREATE TRIGGER trg_batches_updated
  BEFORE UPDATE ON public.product_batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. stock_transactions ledger
CREATE TABLE public.stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.product_batches(id) ON DELETE CASCADE,
  transaction_type public.stock_txn_type NOT NULL,
  quantity_change integer NOT NULL,
  unit_cost numeric(12,2),
  reference text NOT NULL DEFAULT '',
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_transactions TO authenticated;
GRANT ALL ON public.stock_transactions TO service_role;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view stock txn" ON public.stock_transactions
  FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff insert stock txn" ON public.stock_transactions
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()) AND user_id = auth.uid());

CREATE INDEX idx_stxn_batch ON public.stock_transactions(batch_id);
CREATE INDEX idx_stxn_date ON public.stock_transactions(created_at DESC);

-- 5. sale_items: link to a specific batch + record cost for COGS
ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.product_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sale_items_batch ON public.sale_items(batch_id);
