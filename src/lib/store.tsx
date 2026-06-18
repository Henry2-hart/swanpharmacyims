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
  InventoryMovement,
  PharmacySettings,
  Product,
  Role,
  Sale,
  Supplier,
  User,
} from "./types";

interface StoreData {
  users: User[];
  suppliers: Supplier[];
  products: Product[];
  movements: InventoryMovement[];
  sales: Sale[];
  audit: AuditLog[];
  settings: PharmacySettings;
}

interface StoreContextValue extends StoreData {
  currentUser: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  // products
  upsertProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  // suppliers
  upsertSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  // users
  upsertUser: (u: User) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  // inventory
  addMovement: (m: Omit<InventoryMovement, "id" | "date" | "userId">) => Promise<void>;
  // sales
  addSale: (s: Omit<Sale, "id" | "saleNumber" | "date" | "cashierId">) => Promise<Sale | null>;
  // audit
  log: (action: string, detail?: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const emptyData: StoreData = {
  users: [],
  suppliers: [],
  products: [],
  movements: [],
  sales: [],
  audit: [],
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

const mapProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  genericName: r.generic_name ?? "",
  category: r.category ?? "",
  supplierId: r.supplier_id ?? "",
  purchasePrice: Number(r.purchase_price ?? 0),
  sellingPrice: Number(r.selling_price ?? 0),
  quantity: Number(r.quantity ?? 0),
  reorderLevel: Number(r.reorder_level ?? 0),
  batchNumber: r.batch_number ?? "",
  expiryDate: r.expiry_date ?? "",
  description: r.description ?? "",
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapMovement = (r: any): InventoryMovement => ({
  id: r.id,
  productId: r.product_id,
  type: r.type,
  quantity: r.quantity,
  previousQty: r.previous_qty ?? undefined,
  newQty: r.new_qty ?? undefined,
  reason: r.reason ?? "",
  supplierId: r.supplier_id ?? undefined,
  cost: r.cost != null ? Number(r.cost) : undefined,
  date: r.created_at,
  userId: r.user_id,
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
  items: (r.sale_items ?? []).map((i: any) => ({
    productId: i.product_id,
    name: i.name,
    quantity: i.quantity,
    unitPrice: Number(i.unit_price),
    lineTotal: Number(i.line_total),
  })),
});

const mapAudit = (r: any): AuditLog => ({
  id: r.id,
  userId: r.user_id,
  action: r.action,
  detail: r.detail ?? "",
  timestamp: r.created_at,
});

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(emptyData);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  // ----- auth session sync -----
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ----- data fetch -----
  const fetchAll = useCallback(async (uid: string | null) => {
    if (!uid) {
      setData(emptyData);
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Profiles + roles
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

    // Need a role to query other tables
    if (!me || !roleMap.get(uid)) {
      setData({ ...emptyData, users });
      setLoading(false);
      return;
    }

    const [
      { data: suppliers },
      { data: products },
      { data: movements },
      { data: sales },
      { data: audit },
    ] = await Promise.all([
      supabase.from("suppliers").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory_movements").select("*").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
    ]);

    setData({
      users,
      suppliers: (suppliers ?? []).map(mapSupplier),
      products: (products ?? []).map(mapProduct),
      movements: (movements ?? []).map(mapMovement),
      sales: (sales ?? []).map(mapSale),
      audit: (audit ?? []).map(mapAudit),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll(sessionUserId);
  }, [sessionUserId, fetchAll]);

  const refresh = useCallback(() => fetchAll(sessionUserId), [fetchAll, sessionUserId]);

  // ---- audit helper ----
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

  // ---- mutations ----
  const upsertProduct = useCallback(
    async (p: Product) => {
      const payload = {
        name: p.name,
        generic_name: p.genericName,
        category: p.category,
        supplier_id: p.supplierId || null,
        purchase_price: p.purchasePrice,
        selling_price: p.sellingPrice,
        quantity: p.quantity,
        reorder_level: p.reorderLevel,
        batch_number: p.batchNumber,
        expiry_date: p.expiryDate || null,
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

  const addMovement = useCallback(
    async (m: Omit<InventoryMovement, "id" | "date" | "userId">) => {
      if (!sessionUserId) return;
      const product = data.products.find((p) => p.id === m.productId);
      if (!product) return;
      let newQty = product.quantity;
      if (m.type === "in") newQty = product.quantity + m.quantity;
      else if (m.type === "out") newQty = Math.max(0, product.quantity - m.quantity);
      else if (m.type === "adjustment") newQty = m.newQty ?? product.quantity;

      await supabase.from("inventory_movements").insert({
        product_id: m.productId,
        type: m.type,
        quantity: m.quantity,
        previous_qty: product.quantity,
        new_qty: newQty,
        reason: m.reason ?? "",
        supplier_id: m.supplierId ?? null,
        cost: m.cost ?? null,
        user_id: sessionUserId,
      });
      await supabase.from("products").update({ quantity: newQty }).eq("id", m.productId);
      await log(`STOCK_${m.type.toUpperCase()}`, `${product.name} (${m.quantity})`);
      await refresh();
    },
    [data.products, log, refresh, sessionUserId],
  );

  const addSale = useCallback(
    async (s: Omit<Sale, "id" | "saleNumber" | "date" | "cashierId">) => {
      if (!sessionUserId) return null;
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

      const items = s.items.map((i) => ({
        sale_id: created.id,
        product_id: i.productId,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        line_total: i.lineTotal,
      }));
      await supabase.from("sale_items").insert(items);

      // Decrement stock
      for (const item of s.items) {
        const p = data.products.find((x) => x.id === item.productId);
        if (!p) continue;
        await supabase
          .from("products")
          .update({ quantity: Math.max(0, p.quantity - item.quantity) })
          .eq("id", p.id);
      }
      await log("SALE_CREATE", saleNumber);
      await refresh();

      return {
        ...s,
        id: created.id,
        saleNumber,
        date: created.created_at,
        cashierId: sessionUserId,
      } as Sale;
    },
    [data.products, log, refresh, sessionUserId],
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
      addMovement,
      addSale,
      log,
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
      addMovement,
      addSale,
      log,
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
