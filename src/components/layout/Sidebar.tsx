import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  ScanLine,
  Receipt,
  BarChart3,
  Users as UsersIcon,
  ShieldCheck,
  Settings,
  Pill,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/lib/store";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { to: "/products", label: "Products", icon: Package, key: "products" },
  { to: "/inventory", label: "Inventory", icon: Boxes, key: "inventory" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, key: "suppliers" },
  { to: "/pos", label: "POS", icon: ScanLine, key: "pos" },
  { to: "/sales", label: "Sales", icon: Receipt, key: "sales" },
  { to: "/reports", label: "Reports", icon: BarChart3, key: "reports" },
  { to: "/users", label: "Users", icon: UsersIcon, key: "users" },
  { to: "/audit", label: "Audit Logs", icon: ShieldCheck, key: "audit" },
  { to: "/settings", label: "Settings", icon: Settings, key: "settings" },
] as const;

export function Sidebar({ role }: { role: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const visible = items.filter((i) => can(role, i.key));
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Pill className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sidebar-foreground">MediStock</div>
          <div className="text-xs text-muted-foreground">Pharmacy Suite</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visible.map((it) => {
          const active =
            it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-xs text-muted-foreground border-t border-sidebar-border">
        v1.0 · Offline-first prototype
      </div>
    </aside>
  );
}
