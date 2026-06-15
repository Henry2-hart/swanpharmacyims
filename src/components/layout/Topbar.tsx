import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { daysUntil } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Topbar({ title }: { title: string }) {
  const { currentUser, logout, products } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const alerts = useMemo(() => {
    const low = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
    const out = products.filter((p) => p.quantity === 0);
    const exp = products.filter((p) => {
      const d = daysUntil(p.expiryDate);
      return d >= 0 && d <= 90;
    });
    const expired = products.filter((p) => daysUntil(p.expiryDate) < 0);
    return { low, out, exp, expired, total: low.length + out.length + exp.length + expired.length };
  }, [products]);

  const initials = (currentUser?.fullName ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/80 backdrop-blur px-6 py-3">
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="relative ml-auto hidden md:block w-72">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate({ to: "/products", search: { q } as never });
          }}
          placeholder="Search products, sales, suppliers…"
          className="w-full rounded-md border bg-secondary/50 pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {alerts.total > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {alerts.total}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {alerts.total} active alerts
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y">
            {alerts.expired.slice(0, 3).map((p) => (
              <div key={p.id} className="p-3 text-sm">
                <Badge variant="destructive" className="mb-1">Expired</Badge>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">Batch {p.batchNumber}</div>
              </div>
            ))}
            {alerts.exp.slice(0, 3).map((p) => (
              <div key={p.id} className="p-3 text-sm">
                <Badge className="mb-1 bg-warning text-warning-foreground">Expiring</Badge>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  In {daysUntil(p.expiryDate)} days
                </div>
              </div>
            ))}
            {alerts.out.slice(0, 3).map((p) => (
              <div key={p.id} className="p-3 text-sm">
                <Badge variant="destructive" className="mb-1">Out of stock</Badge>
                <div className="font-medium">{p.name}</div>
              </div>
            ))}
            {alerts.low.slice(0, 3).map((p) => (
              <div key={p.id} className="p-3 text-sm">
                <Badge variant="secondary" className="mb-1">Low stock</Badge>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.quantity} left · reorder at {p.reorderLevel}
                </div>
              </div>
            ))}
            {alerts.total === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                You're all caught up.
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-secondary">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {initials}
            </span>
            <span className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium leading-none">{currentUser?.fullName}</span>
              <span className="text-[11px] text-muted-foreground capitalize">{currentUser?.role}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>{currentUser?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              navigate({ to: "/auth" });
            }}
            className="text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
