import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Boxes,
  DollarSign,
  ShoppingCart,
  CalendarRange,
  AlertTriangle,
  PackageX,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useStore } from "@/lib/store";
import { currency, daysUntil, dateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "accent" | "warning" | "destructive" | "success";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="stat-card flex items-start justify-between">
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

function Dashboard() {
  const { products, sales } = useStore();

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
    const inventoryValue = products.reduce(
      (s, p) => s + p.quantity * p.purchasePrice,
      0,
    );
    const todaySales = sales
      .filter((s) => new Date(s.date).toDateString() === todayStr)
      .reduce((s, x) => s + x.total, 0);
    const monthSales = sales
      .filter((s) => {
        const d = new Date(s.date);
        return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
      })
      .reduce((s, x) => s + x.total, 0);
    const lowStock = products.filter(
      (p) => p.quantity > 0 && p.quantity <= p.reorderLevel,
    );
    const expiring = products.filter((p) => {
      const d = daysUntil(p.expiryDate);
      return d >= 0 && d <= 90;
    });
    const outOfStock = products.filter((p) => p.quantity === 0);
    return {
      totalProducts: products.length,
      inventoryValue,
      todaySales,
      monthSales,
      lowStock,
      expiring,
      outOfStock,
    };
  }, [products, sales]);

  const salesTrend = useMemo(() => {
    const days: { day: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const total = sales
        .filter((s) => new Date(s.date).toDateString() === key)
        .reduce((sum, x) => sum + x.total, 0);
      days.push({
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        total,
      });
    }
    return days;
  }, [sales]);

  const topProducts = useMemo(() => {
    const tally = new Map<string, number>();
    sales.forEach((s) =>
      s.items.forEach((it) => {
        tally.set(it.name, (tally.get(it.name) ?? 0) + it.quantity);
      }),
    );
    return Array.from(tally.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  const recentSales = sales.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={String(stats.totalProducts)} icon={Boxes} />
        <StatCard
          label="Inventory Value"
          value={currency(stats.inventoryValue)}
          icon={DollarSign}
          tone="accent"
        />
        <StatCard
          label="Today's Sales"
          value={currency(stats.todaySales)}
          icon={ShoppingCart}
          tone="success"
        />
        <StatCard
          label="Monthly Sales"
          value={currency(stats.monthSales)}
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Low Stock Items"
          value={String(stats.lowStock.length)}
          icon={AlertTriangle}
          tone="warning"
          hint="Below reorder level"
        />
        <StatCard
          label="Expiring Soon"
          value={String(stats.expiring.length)}
          icon={CalendarRange}
          tone="warning"
          hint="Within 90 days"
        />
        <StatCard
          label="Out of Stock"
          value={String(stats.outOfStock.length)}
          icon={PackageX}
          tone="destructive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales — last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => currency(v)}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-accent)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="qty" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium">{s.saleNumber}</div>
                  <div className="text-xs text-muted-foreground">{dateTime(s.date)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{currency(s.total)}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {s.paymentMethod.replace("_", " ")}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...stats.outOfStock, ...stats.lowStock, ...stats.expiring]
              .slice(0, 6)
              .map((p) => {
                const isOut = p.quantity === 0;
                const isLow = !isOut && p.quantity <= p.reorderLevel;
                const days = daysUntil(p.expiryDate);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.category} · Batch {p.batchNumber}
                      </div>
                    </div>
                    {isOut ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : isLow ? (
                      <Badge className="bg-warning text-warning-foreground">Low: {p.quantity}</Badge>
                    ) : days < 0 ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="secondary">Expires {days}d</Badge>
                    )}
                  </div>
                );
              })}
            {stats.outOfStock.length + stats.lowStock.length + stats.expiring.length === 0 && (
              <div className="text-sm text-muted-foreground">No critical alerts.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
