import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  seedAudit,
  seedMovements,
  seedProducts,
  seedSales,
  seedSuppliers,
  seedUsers,
} from "./mock-data";
import type {
  AuditLog,
  InventoryMovement,
  Product,
  Sale,
  Supplier,
  User,
} from "./types";

const STORAGE_KEY = "pharma-store-v1";
const SESSION_KEY = "pharma-session-v1";

interface StoreData {
  users: User[];
  suppliers: Supplier[];
  products: Product[];
  movements: InventoryMovement[];
  sales: Sale[];
  audit: AuditLog[];
}

interface StoreContextValue extends StoreData {
  currentUser: User | null;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  resetData: () => void;
  // products
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  // suppliers
  upsertSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;
  // users
  upsertUser: (u: User) => void;
  toggleUserStatus: (id: string) => void;
  // inventory
  addMovement: (m: Omit<InventoryMovement, "id" | "date" | "userId">) => void;
  // sales
  addSale: (s: Omit<Sale, "id" | "saleNumber" | "date" | "cashierId">) => Sale;
  // audit
  log: (action: string, detail?: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const initial = (): StoreData => ({
  users: seedUsers,
  suppliers: seedSuppliers,
  products: seedProducts,
  movements: seedMovements,
  sales: seedSales,
  audit: seedAudit,
});

const uid = () => Math.random().toString(36).slice(2, 10);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StoreData>(() => {
    if (typeof window === "undefined") return initial();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoreData) : initial();
    } catch {
      return initial();
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    if (currentUser) localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(SESSION_KEY);
  }, [currentUser]);

  const log = useCallback(
    (action: string, detail?: string) => {
      setData((d) => ({
        ...d,
        audit: [
          {
            id: uid(),
            userId: currentUser?.id ?? "system",
            action,
            detail,
            timestamp: new Date().toISOString(),
          },
          ...d.audit,
        ].slice(0, 500),
      }));
    },
    [currentUser],
  );

  const login = useCallback(
    (email: string, password: string) => {
      const u = data.users.find(
        (x) =>
          x.email.toLowerCase() === email.toLowerCase() &&
          x.password === password &&
          x.status === "active",
      );
      if (u) {
        setCurrentUser(u);
        setData((d) => ({
          ...d,
          audit: [
            {
              id: uid(),
              userId: u.id,
              action: "LOGIN",
              detail: `${u.fullName} signed in`,
              timestamp: new Date().toISOString(),
            },
            ...d.audit,
          ],
        }));
        return u;
      }
      return null;
    },
    [data.users],
  );

  const logout = useCallback(() => {
    if (currentUser) log("LOGOUT", `${currentUser.fullName} signed out`);
    setCurrentUser(null);
  }, [currentUser, log]);

  const value = useMemo<StoreContextValue>(
    () => ({
      ...data,
      currentUser,
      login,
      logout,
      resetData: () => setData(initial()),
      upsertProduct: (p) => {
        setData((d) => {
          const exists = d.products.some((x) => x.id === p.id);
          return {
            ...d,
            products: exists
              ? d.products.map((x) => (x.id === p.id ? p : x))
              : [{ ...p, id: p.id || uid() }, ...d.products],
          };
        });
        log(currentUser ? "PRODUCT_UPSERT" : "PRODUCT_UPSERT", p.name);
      },
      deleteProduct: (id) => {
        setData((d) => ({ ...d, products: d.products.filter((x) => x.id !== id) }));
        log("PRODUCT_DELETE", id);
      },
      upsertSupplier: (s) => {
        setData((d) => {
          const exists = d.suppliers.some((x) => x.id === s.id);
          return {
            ...d,
            suppliers: exists
              ? d.suppliers.map((x) => (x.id === s.id ? s : x))
              : [{ ...s, id: s.id || uid() }, ...d.suppliers],
          };
        });
        log("SUPPLIER_UPSERT", s.name);
      },
      deleteSupplier: (id) => {
        setData((d) => ({ ...d, suppliers: d.suppliers.filter((x) => x.id !== id) }));
        log("SUPPLIER_DELETE", id);
      },
      upsertUser: (u) => {
        setData((d) => {
          const exists = d.users.some((x) => x.id === u.id);
          return {
            ...d,
            users: exists
              ? d.users.map((x) => (x.id === u.id ? u : x))
              : [{ ...u, id: u.id || uid() }, ...d.users],
          };
        });
        log("USER_UPSERT", u.email);
      },
      toggleUserStatus: (id) => {
        setData((d) => ({
          ...d,
          users: d.users.map((x) =>
            x.id === id ? { ...x, status: x.status === "active" ? "disabled" : "active" } : x,
          ),
        }));
        log("USER_STATUS_TOGGLE", id);
      },
      addMovement: (m) => {
        const movement: InventoryMovement = {
          ...m,
          id: uid(),
          date: new Date().toISOString(),
          userId: currentUser?.id ?? "system",
        };
        setData((d) => {
          const products = d.products.map((p) => {
            if (p.id !== m.productId) return p;
            let newQty = p.quantity;
            if (m.type === "in") newQty = p.quantity + m.quantity;
            else if (m.type === "out") newQty = Math.max(0, p.quantity - m.quantity);
            else if (m.type === "adjustment") newQty = m.newQty ?? p.quantity;
            return { ...p, quantity: newQty, updatedAt: new Date().toISOString() };
          });
          return { ...d, products, movements: [movement, ...d.movements] };
        });
        log(
          `STOCK_${m.type.toUpperCase()}`,
          `Product ${m.productId} qty ${m.quantity}`,
        );
      },
      addSale: (s) => {
        const sale: Sale = {
          ...s,
          id: uid(),
          saleNumber: `INV-${1000 + Math.floor(Math.random() * 9000)}`,
          date: new Date().toISOString(),
          cashierId: currentUser?.id ?? "u3",
        };
        setData((d) => {
          const products = d.products.map((p) => {
            const item = s.items.find((i) => i.productId === p.id);
            if (!item) return p;
            return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
          });
          return { ...d, products, sales: [sale, ...d.sales] };
        });
        log("SALE_CREATE", sale.saleNumber);
        return sale;
      },
      log,
    }),
    [data, currentUser, login, logout, log],
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
