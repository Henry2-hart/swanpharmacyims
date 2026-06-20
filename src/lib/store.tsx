import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AuditLog,
  Batch,
  InventoryMovement,
  PharmacySettings,
  Product,
  Role,
  Sale,
  SaleItem,
  StockTransaction,
  StockTxnType,
  Supplier,
  User,
} from "./types";

interface StoreData {
  users: User[];
  suppliers: Supplier[];
  products: Product[];
  batches: Batch[];
  transactions: StockTransaction[];
  movements: InventoryMovement[]; // derived from transactions for legacy views
  sales: Sale[];
  audit: AuditLog[];
  settings: PharmacySettings;
}

interface StoreContextValue extends StoreData {
  currentUser: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  upsertProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  upsertSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  upsertUser: (u: User) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  // batches & stock
  addBatch: (
    b: Omit<Batch, "id" | "createdAt" | "availableQuantity"> & { reference?: string },
  ) => Promise<Batch | null>;
  recordTransaction: (
    batchId: string,
    type: StockTxnType,
    quantityChange: number,
    opts?: { unitCost?: number | null; reference?: string },
  ) => Promise<void>;
  addSale: (s: Omit<Sale, "id" | "saleNumber" | "date" | "cashierId">) => Promise<Sale | null>;
  log: (action: string, detail?: string) => Promise<void>;
  updateSettings: (s: PharmacySettings) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const defaultSettings: PharmacySettings = {
  businessName: "MediStock Pharmacy",
  address: "",
  phone: "",
  email: "",
  taxRate: 5,
  receiptFooter: "Thank you for your purchase!",
  lowStockThreshold: 10,
};

const emptyData: StoreData = {
  users: [],
  suppliers: [],
  products: [],
  batches: [],
  transactions: [],
  movements: [],
  sales: [],
  audit: [],
  settings: defaultSettings,
};

// ---- mappers ----
const mapSupplier = (r: any): Supplier => ({
  id: r.id,
  name: r.name,
  contactPerson: r.contact_person ?? "",
  phone: r.phone ?? "",
  email: r.email ?? "",
  address: r.address ?? "",
  createdAt: r.created_at,
});

const mapAudit = (r: any): AuditLog => ({
  id: r.id,
  userId: r.user_id,
  action: r.action,
  detail: r.detail ?? "",
  timestamp: r.created_at,
});

const mapSale = (r: any): Sale => ({
  id: r.id,
  saleNumber: r.sale_number,
  date: r.created_at,
  cashierId: r.cashier_id,
  subtotal: Number(r.subtotal),
  discount: Number(r.discount),
  tax: Number(r.tax),
  total: Number(r.total),
  paymentMethod: r.payment_method,
  items: (r.sale_items ?? []).map(
    (i: any): SaleItem => ({
      productId: i.product_id,
      batchId: i.batch_id ?? undefined,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      unitCost: Number(i.unit_cost ?? 0),
      lineTotal: Number(i.line_total),
    }),
  ),
});

// Map ledger txn types to legacy movement types so the audit/movements
// section keeps working without a separate read.
const txnToMovementType = (t: StockTxnType): InventoryMovement["type"] => {
  if (t === "purchase" || t === "opening" || t === "return") return "in";
  if (t === "sale" || t === "damage" || t === "expired") return "out";
  return "adjustment";
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchAll = useCallback(async (uid: string | null) => {
    if (!uid) {
      setData(emptyData);
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);
    const roleMap = new Map<string, Role>();
    (roles ?? []).forEach((r: any) => roleMap.set(r.user_id, r.role));
    const users: User[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      fullName: p.full_name || p.email,
      email: p.email,
      phone: p.phone ?? "",
      role: (roleMap.get(p.id) ?? "cashier") as Role,
      status: p.status,
      createdAt: p.created_at,
    }));

    const me = users.find((u) => u.id === uid) ?? null;
    setCurrentUser(me);

    if (!me || !roleMap.get(uid)) {
      setData({ ...emptyData, users });
      setLoading(false);
      return;
    }

    const [
      { data: suppliers },
      { data: productsRaw },
      { data: batchesRaw },
      { data: txnsRaw },
      { data: sales },
      { data: audit },
      { data: settingsRow },
    ] = await Promise.all([
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_batches").select("*").order("created_at", { ascending: false }),
      supabase
        .from("stock_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("pharmacy_settings").select("*").maybeSingle(),
    ]);

    const settings: PharmacySettings = settingsRow
      ? {
          businessName: settingsRow.business_name ?? defaultSettings.businessName,
          address: settingsRow.address ?? "",
          phone: settingsRow.phone ?? "",
          email: settingsRow.email ?? "",
          taxRate: Number(settingsRow.tax_rate ?? defaultSettings.taxRate),
          receiptFooter: settingsRow.receipt_footer ?? defaultSettings.receiptFooter,
          lowStockThreshold: Number(
            settingsRow.low_stock_threshold ?? defaultSettings.lowStockThreshold,
          ),
        }
      : defaultSettings;

    // Sum quantity_change per batch from ledger
    const batchQty = new Map<string, number>();
    (txnsRaw ?? []).forEach((t: any) => {
      batchQty.set(t.batch_id, (batchQty.get(t.batch_id) ?? 0) + Number(t.quantity_change));
    });

    const batches: Batch[] = (batchesRaw ?? []).map((b: any) => ({
      id: b.id,
      productId: b.product_id,
      supplierId: b.supplier_id ?? "",
      batchNumber: b.batch_number ?? "",
      manufactureDate: b.manufacture_date ?? "",
      expiryDate: b.expiry_date ?? "",
      purchasePrice: Number(b.purchase_price ?? 0),
      sellingPrice: Number(b.selling_price ?? 0),
      initialQuantity: Number(b.initial_quantity ?? 0),
      availableQuantity: batchQty.get(b.id) ?? 0,
      notes: b.notes ?? "",
      createdAt: b.created_at,
    }));

    // Derive product fields from batches
    const batchesByProduct = new Map<string, Batch[]>();
    batches.forEach((b) => {
      const list = batchesByProduct.get(b.productId) ?? [];
      list.push(b);
      batchesByProduct.set(b.productId, list);
    });

    const todayMs = Date.now();
    const products: Product[] = (productsRaw ?? []).map((r: any) => {
      const list = batchesByProduct.get(r.id) ?? [];
      const totalQty = list.reduce((s, b) => s + Math.max(0, b.availableQuantity), 0);
      const stockValue = list.reduce(
        (s, b) => s + Math.max(0, b.availableQuantity) * b.purchasePrice,
        0,
      );
      // Latest batch (most recently created) provides default selling price
      const latest = list[0]; // already ordered desc
      // Earliest non-expired batch with stock provides reference expiry
      const upcoming = [...list]
        .filter((b) => b.availableQuantity > 0 && b.expiryDate)
        .sort((a, b) => +new Date(a.expiryDate) - +new Date(b.expiryDate))[0];
      const avgCost =
        totalQty > 0
          ? list.reduce(
              (s, b) => s + Math.max(0, b.availableQuantity) * b.purchasePrice,
              0,
            ) / totalQty
          : (latest?.purchasePrice ?? 0);
      return {
        id: r.id,
        name: r.name,
        genericName: r.generic_name ?? "",
        category: r.category ?? "",
        manufacturer: r.manufacturer ?? "",
        dosageForm: r.dosage_form ?? "",
        strength: r.strength ?? "",
        supplierId: r.supplier_id ?? "",
        reorderLevel: Number(r.reorder_level ?? 0),
        active: r.active ?? true,
        description: r.description ?? "",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        quantity: totalQty,
        purchasePrice: avgCost,
        sellingPrice: latest?.sellingPrice ?? Number(r.selling_price ?? 0),
        expiryDate: upcoming?.expiryDate ?? latest?.expiryDate ?? "",
        batchNumber: latest?.batchNumber ?? "",
        stockValue,
      };
    });
    void todayMs;

    const batchProductMap = new Map(batches.map((b) => [b.id, b.productId]));
    const transactions: StockTransaction[] = (txnsRaw ?? []).map((t: any) => ({
      id: t.id,
      batchId: t.batch_id,
      productId: batchProductMap.get(t.batch_id) ?? "",
      transactionType: t.transaction_type,
      quantityChange: Number(t.quantity_change),
      unitCost: t.unit_cost != null ? Number(t.unit_cost) : null,
      reference: t.reference ?? "",
      userId: t.user_id,
      createdAt: t.created_at,
    }));

    const movements: InventoryMovement[] = transactions.map((t) => ({
      id: t.id,
      productId: t.productId,
      type: txnToMovementType(t.transactionType),
      quantity: Math.abs(t.quantityChange),
      reason: t.reference || t.transactionType,
      cost: t.unitCost ?? undefined,
      date: t.createdAt,
      userId: t.userId,
    }));

    setData({
      users,
      suppliers: (suppliers ?? []).map(mapSupplier),
      products,
      batches,
      transactions,
      movements,
      sales: (sales ?? []).map(mapSale),
      audit: (audit ?? []).map(mapAudit),
      settings,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll(sessionUserId);
  }, [sessionUserId, fetchAll]);

  const refresh = useCallback(() => fetchAll(sessionUserId), [fetchAll, sessionUserId]);

  const log = useCallback(
    async (action: string, detail?: string) => {
      if (!sessionUserId) return;
      await supabase
        .from("audit_logs")
        .insert({ user_id: sessionUserId, action, detail: detail ?? "" });
    },
    [sessionUserId],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setData(emptyData);
    setCurrentUser(null);
  }, []);

  const upsertProduct = useCallback(
    async (p: Product) => {
      const payload = {
        name: p.name,
        generic_name: p.genericName,
        category: p.category,
        manufacturer: p.manufacturer,
        dosage_form: p.dosageForm,
        strength: p.strength,
        supplier_id: p.supplierId || null,
        reorder_level: p.reorderLevel,
        active: p.active,
        description: p.description,
      };
      if (p.id) {
        await supabase.from("products").update(payload).eq("id", p.id);
      } else {
        await supabase.from("products").insert(payload);
      }
      await log("PRODUCT_UPSERT", p.name);
      await refresh();
    },
    [log, refresh],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await supabase.from("products").delete().eq("id", id);
      await log("PRODUCT_DELETE", id);
      await refresh();
    },
    [log, refresh],
  );

  const upsertSupplier = useCallback(
    async (s: Supplier) => {
      const payload = {
        name: s.name,
        contact_person: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
      };
      if (s.id) await supabase.from("suppliers").update(payload).eq("id", s.id);
      else await supabase.from("suppliers").insert(payload);
      await log("SUPPLIER_UPSERT", s.name);
      await refresh();
    },
    [log, refresh],
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      await supabase.from("suppliers").delete().eq("id", id);
      await log("SUPPLIER_DELETE", id);
      await refresh();
    },
    [log, refresh],
  );

  const upsertUser = useCallback(
    async (u: User) => {
      if (!u.id) return;
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: u.fullName, phone: u.phone, status: u.status })
        .eq("id", u.id);
      if (profErr) throw profErr;
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", u.id);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from("user_roles")
        .insert({ user_id: u.id, role: u.role });
      if (insErr) throw insErr;
      await log("USER_UPSERT", `${u.email} → ${u.role}`);
      await refresh();
    },
    [log, refresh],
  );

  const toggleUserStatus = useCallback(
    async (id: string) => {
      const u = data.users.find((x) => x.id === id);
      if (!u) return;
      const next = u.status === "active" ? "disabled" : "active";
      await supabase.from("profiles").update({ status: next }).eq("id", id);
      await log("USER_STATUS_TOGGLE", `${u.email} → ${next}`);
      await refresh();
    },
    [data.users, log, refresh],
  );

  const recordTransaction = useCallback(
    async (
      batchId: string,
      type: StockTxnType,
      quantityChange: number,
      opts?: { unitCost?: number | null; reference?: string },
    ) => {
      if (!sessionUserId) return;
      await supabase.from("stock_transactions").insert({
        batch_id: batchId,
        transaction_type: type,
        quantity_change: quantityChange,
        unit_cost: opts?.unitCost ?? null,
        reference: opts?.reference ?? "",
        user_id: sessionUserId,
      });
    },
    [sessionUserId],
  );

  const addBatch = useCallback(
    async (b: Omit<Batch, "id" | "createdAt" | "availableQuantity"> & { reference?: string }) => {
      if (!sessionUserId) return null;
      const { data: created, error } = await supabase
        .from("product_batches")
        .insert({
          product_id: b.productId,
          supplier_id: b.supplierId || null,
          batch_number: b.batchNumber,
          manufacture_date: b.manufactureDate || null,
          expiry_date: b.expiryDate || null,
          purchase_price: b.purchasePrice,
          selling_price: b.sellingPrice,
          initial_quantity: b.initialQuantity,
          notes: b.notes,
        })
        .select()
        .single();
      if (error || !created) return null;

      if (b.initialQuantity > 0) {
        await supabase.from("stock_transactions").insert({
          batch_id: created.id,
          transaction_type: "purchase",
          quantity_change: b.initialQuantity,
          unit_cost: b.purchasePrice,
          reference: b.reference ?? `Opening batch ${b.batchNumber}`,
          user_id: sessionUserId,
        });
      }
      await log("BATCH_CREATE", `${b.batchNumber} (${b.initialQuantity})`);
      await refresh();
      return {
        ...b,
        id: created.id,
        createdAt: created.created_at,
        availableQuantity: b.initialQuantity,
      } as Batch;
    },
    [log, refresh, sessionUserId],
  );

  const addSale = useCallback(
    async (s: Omit<Sale, "id" | "saleNumber" | "date" | "cashierId">) => {
      if (!sessionUserId) return null;

      // FEFO allocation: for each cart line, consume from batches sorted by
      // earliest expiry (then earliest creation as tiebreaker).
      type Allocated = {
        productId: string;
        batchId: string;
        name: string;
        qty: number;
        unitPrice: number;
        unitCost: number;
      };
      const allocated: Allocated[] = [];
      // working copy of batch availability
      const avail = new Map<string, number>(data.batches.map((b) => [b.id, b.availableQuantity]));

      for (const line of s.items) {
        const candidates = data.batches
          .filter((b) => b.productId === line.productId && (avail.get(b.id) ?? 0) > 0)
          .sort((a, b) => {
            const ea = a.expiryDate ? +new Date(a.expiryDate) : Number.POSITIVE_INFINITY;
            const eb = b.expiryDate ? +new Date(b.expiryDate) : Number.POSITIVE_INFINITY;
            if (ea !== eb) return ea - eb;
            return +new Date(a.createdAt) - +new Date(b.createdAt);
          });
        let remaining = line.quantity;
        for (const b of candidates) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, avail.get(b.id) ?? 0);
          if (take <= 0) continue;
          avail.set(b.id, (avail.get(b.id) ?? 0) - take);
          allocated.push({
            productId: line.productId,
            batchId: b.id,
            name: line.name,
            qty: take,
            unitPrice: line.unitPrice,
            unitCost: b.purchasePrice,
          });
          remaining -= take;
        }
        if (remaining > 0) {
          throw new Error(`Insufficient stock for ${line.name} (${remaining} short)`);
        }
      }

      const saleNumber = `INV-${Date.now().toString().slice(-7)}`;
      const { data: created, error } = await supabase
        .from("sales")
        .insert({
          sale_number: saleNumber,
          cashier_id: sessionUserId,
          subtotal: s.subtotal,
          discount: s.discount,
          tax: s.tax,
          total: s.total,
          payment_method: s.paymentMethod,
        })
        .select()
        .single();
      if (error || !created) return null;

      const itemRows = allocated.map((a) => ({
        sale_id: created.id,
        product_id: a.productId,
        batch_id: a.batchId,
        name: a.name,
        quantity: a.qty,
        unit_price: a.unitPrice,
        unit_cost: a.unitCost,
        line_total: a.qty * a.unitPrice,
      }));
      await supabase.from("sale_items").insert(itemRows);

      const txnRows = allocated.map((a) => ({
        batch_id: a.batchId,
        transaction_type: "sale" as const,
        quantity_change: -a.qty,
        unit_cost: a.unitCost,
        reference: saleNumber,
        user_id: sessionUserId,
      }));
      await supabase.from("stock_transactions").insert(txnRows);

      await log("SALE_CREATE", saleNumber);
      await refresh();

      return {
        ...s,
        id: created.id,
        saleNumber,
        date: created.created_at,
        cashierId: sessionUserId,
        items: allocated.map((a) => ({
          productId: a.productId,
          batchId: a.batchId,
          name: a.name,
          quantity: a.qty,
          unitPrice: a.unitPrice,
          unitCost: a.unitCost,
          lineTotal: a.qty * a.unitPrice,
        })),
      } as Sale;
    },
    [data.batches, log, refresh, sessionUserId],
  );

  const updateSettings = useCallback(
    async (s: PharmacySettings) => {
      const payload = {
        id: true,
        business_name: s.businessName,
        address: s.address,
        phone: s.phone,
        email: s.email,
        tax_rate: s.taxRate,
        receipt_footer: s.receiptFooter,
        low_stock_threshold: s.lowStockThreshold,
      };
      const { error } = await supabase
        .from("pharmacy_settings")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
      await log("SETTINGS_UPDATE", s.businessName);
      await refresh();
    },
    [log, refresh],
  );

  const value = useMemo<StoreContextValue>(
    () => ({
      ...data,
      currentUser,
      loading,
      refresh,
      logout,
      upsertProduct,
      deleteProduct,
      upsertSupplier,
      deleteSupplier,
      upsertUser,
      toggleUserStatus,
      addBatch,
      recordTransaction,
      addSale,
      log,
      updateSettings,
    }),
    [
      data,
      currentUser,
      loading,
      refresh,
      logout,
      upsertProduct,
      deleteProduct,
      upsertSupplier,
      deleteSupplier,
      upsertUser,
      toggleUserStatus,
      addBatch,
      recordTransaction,
      addSale,
      log,
      updateSettings,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: ["*"],
  manager: [
    "dashboard",
    "products",
    "inventory",
    "suppliers",
    "pos",
    "sales",
    "reports",
    "audit",
    "settings",
  ],
  cashier: ["dashboard", "pos", "sales", "products"],
  pharmacist: ["dashboard", "products", "inventory", "sales"],
};

export function can(role: string | undefined, module: string) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes("*") || perms.includes(module);
}
