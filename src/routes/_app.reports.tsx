import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { currency, daysUntil, shortDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type Period = "daily" | "weekly" | "monthly" | "yearly";

function ReportsPage() {
  const { sales, products } = useStore();
  const [period, setPeriod] = useState<Period>("daily");

  const salesByPeriod = useMemo(() => {
    const buckets = new Map<string, number>();
    sales.forEach((s) => {
      const d = new Date(s.date);
      let key = "";
      if (period === "daily") key = d.toLocaleDateString();
      else if (period === "weekly") {
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
        key = `W${week} ${d.getFullYear()}`;
      } else if (period === "monthly") key = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      else key = String(d.getFullYear());
      buckets.set(key, (buckets.get(key) ?? 0) + s.total);
    });
    return Array.from(buckets.entries()).map(([k, v]) => ({ label: k, total: v }));
  }, [sales, period]);

  const totalRevenue = sales.reduce((s, x) => s + x.total, 0);
  const totalCost = sales.reduce(
    (s, x) =>
      s +
      x.items.reduce((sum, i) => {
        const p = products.find((p) => p.id === i.productId);
        return sum + (p?.purchasePrice ?? 0) * i.quantity;
      }, 0),
    0,
  );
  const profit = totalRevenue - totalCost;

  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
  const outOfStock = products.filter((p) => p.quantity === 0);
  const expiring = products.filter((p) => {
    const d = daysUntil(p.expiryDate);
    return d >= 0 && d <= 90;
  });
  const expired = products.filter((p) => daysUntil(p.expiryDate) < 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total Revenue" value={currency(totalRevenue)} />
        <Stat label="Cost of Goods" value={currency(totalCost)} />
        <Stat label="Profit" value={currency(profit)} tone="success" />
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expiry">Expiry</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales — {period}</CardTitle>
              <div className="flex gap-2">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
                  <Button key={p} variant={period === p ? "default" : "outline"} size="sm" onClick={() => setPeriod(p)}>
                    {p}
                  </Button>
                ))}
                <Actions />
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByPeriod}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
                    formatter={(v: number) => currency(v)}
                  />
                  <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <ReportTable
            title="Current Stock"
            rows={products.map((p) => [p.name, p.category, p.quantity, currency(p.sellingPrice)])}
            headers={["Product", "Category", "Qty", "Price"]}
          />
          <ReportTable
            title="Low Stock"
            rows={lowStock.map((p) => [p.name, p.quantity, p.reorderLevel])}
            headers={["Product", "Qty", "Reorder Level"]}
          />
          <ReportTable
            title="Out of Stock"
            rows={outOfStock.map((p) => [p.name, p.category, p.batchNumber])}
            headers={["Product", "Category", "Batch"]}
          />
        </TabsContent>

        <TabsContent value="expiry" className="space-y-4">
          <ReportTable
            title="Expiring Soon (≤ 90 days)"
            rows={expiring.map((p) => [p.name, p.batchNumber, shortDate(p.expiryDate), `${daysUntil(p.expiryDate)} days`])}
            headers={["Product", "Batch", "Expiry", "Time Left"]}
          />
          <ReportTable
            title="Expired"
            rows={expired.map((p) => [p.name, p.batchNumber, shortDate(p.expiryDate)])}
            headers={["Product", "Batch", "Expired On"]}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <ReportTable
            title="Profit per Product"
            rows={products.map((p) => {
              const margin = p.sellingPrice - p.purchasePrice;
              return [p.name, currency(p.purchasePrice), currency(p.sellingPrice), currency(margin)];
            })}
            headers={["Product", "Cost", "Price", "Margin"]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Actions() {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-1" /> Print
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          window.print();
        }}
      >
        <Download className="h-4 w-4 mr-1" /> Export PDF
      </Button>
    </>
  );
}

function Stat({ label, value, tone = "primary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="stat-card">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === "success" ? "text-success" : ""}`}>{value}</div>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Actions />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b">
            <tr>
              {headers.map((h) => (
                <th key={h} className="py-2 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                {r.map((c, j) => (
                  <td key={j} className="py-2 pr-4">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-muted-foreground">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
