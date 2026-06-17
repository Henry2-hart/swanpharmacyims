import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Search, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { currency, dateTime, shortDate, daysUntil } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MovementType, Product } from "@/lib/types";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { movements, products, suppliers, addMovement } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "expiring">("all");
  const [open, setOpen] = useState<MovementType | null>(null);
  const [draft, setDraft] = useState({
    productId: "",
    quantity: 0,
    newQty: 0,
    reason: "",
    supplierId: "",
    cost: 0,
  });

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.genericName.toLowerCase().includes(q.toLowerCase()) ||
        p.batchNumber.toLowerCase().includes(q.toLowerCase());
      if (!matchesQ) return false;
      const days = daysUntil(p.expiryDate);
      if (filter === "out") return p.quantity === 0;
      if (filter === "low") return p.quantity > 0 && p.quantity <= p.reorderLevel;
      if (filter === "expiring") return days >= 0 && days <= 90;
      return true;
    });
  }, [products, q, filter]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const totalValue = products.reduce((s, p) => s + p.quantity * p.purchasePrice, 0);
    const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).length;
    const outOfStock = products.filter((p) => p.quantity === 0).length;
    return { totalUnits, totalValue, lowStock, outOfStock };
  }, [products]);

  const openAction = (type: MovementType, p?: Product) => {
    setDraft({
      productId: p?.id ?? "",
      quantity: 0,
      newQty: p?.quantity ?? 0,
      reason: "",
      supplierId: p?.supplierId ?? "",
      cost: p?.purchasePrice ?? 0,
    });
    setOpen(type);
  };

  const submit = async () => {
    if (!draft.productId || !open) return toast.error("Select a product");
    const product = products.find((p) => p.id === draft.productId)!;
    if (open === "adjustment") {
      await addMovement({
        productId: draft.productId,
        type: "adjustment",
        quantity: draft.newQty - product.quantity,
        previousQty: product.quantity,
        newQty: draft.newQty,
        reason: draft.reason,
      });
    } else {
      if (draft.quantity <= 0) return toast.error("Quantity must be greater than 0");
      if (open === "out" && draft.quantity > product.quantity)
        return toast.error("Not enough stock available");
      await addMovement({
        productId: draft.productId,
        type: open,
        quantity: draft.quantity,
        reason: draft.reason,
        supplierId: open === "in" ? draft.supplierId : undefined,
        cost: open === "in" ? draft.cost : undefined,
      });
    }
    toast.success("Stock updated");
    setOpen(null);
  };

  const stockBadge = (p: Product) => {
    const days = daysUntil(p.expiryDate);
    if (p.quantity === 0) return <Badge variant="destructive">Out of stock</Badge>;
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (p.quantity <= p.reorderLevel)
      return <Badge className="bg-warning text-warning-foreground">Low</Badge>;
    if (days <= 90) return <Badge variant="secondary">Expiring</Badge>;
    return <Badge className="bg-success text-success-foreground">In stock</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total SKUs" value={String(products.length)} />
        <StatCard label="Units in Stock" value={stats.totalUnits.toLocaleString()} />
        <StatCard label="Stock Value" value={currency(stats.totalValue)} />
        <StatCard
          label="Alerts"
          value={`${stats.lowStock} low · ${stats.outOfStock} out`}
          accent={stats.lowStock + stats.outOfStock > 0 ? "warning" : "default"}
        />
      </div>

      <Tabs defaultValue="stock">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="stock">Available Stock</TabsTrigger>
            <TabsTrigger value="movements">Movements History</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => openAction("in")}>
              <ArrowDownToLine className="h-4 w-4 mr-1" /> Stock In
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAction("out")}>
              <ArrowUpFromLine className="h-4 w-4 mr-1" /> Stock Out
            </Button>
            <Button size="sm" variant="outline" onClick={() => openAction("adjustment")}>
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Adjust
            </Button>
          </div>
        </div>

        <TabsContent value="stock" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, generic, or batch…"
                className="pl-8"
              />
            </div>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
                <SelectItem value="expiring">Expiring (≤90d)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder At</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.genericName}</div>
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-muted-foreground">{p.batchNumber || "—"}</TableCell>
                    <TableCell>{p.expiryDate ? shortDate(p.expiryDate) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{p.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.reorderLevel}</TableCell>
                    <TableCell className="text-right">{currency(p.quantity * p.purchasePrice)}</TableCell>
                    <TableCell>{stockBadge(p)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => openAction("in", p)} title="Stock in">
                        <ArrowDownToLine className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openAction("out", p)} title="Stock out">
                        <ArrowUpFromLine className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openAction("adjustment", p)} title="Adjust">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                      No products to display. Add products from the Products page to start tracking inventory.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Reason / Supplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{dateTime(m.date)}</TableCell>
                    <TableCell>{productName(m.productId)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          m.type === "in"
                            ? "bg-success text-success-foreground"
                            : m.type === "out"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-accent text-accent-foreground"
                        }
                      >
                        {m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.type === "adjustment"
                        ? `${m.previousQty} → ${m.newQty}`
                        : `${m.type === "in" ? "+" : "−"}${m.quantity}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.reason ||
                        (m.supplierId
                          ? suppliers.find((s) => s.id === m.supplierId)?.name
                          : "—")}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No stock movements yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "in" && "Record Stock In"}
              {open === "out" && "Record Stock Out"}
              {open === "adjustment" && "Stock Adjustment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Product</Label>
              <Select
                value={draft.productId}
                onValueChange={(v) => {
                  const p = products.find((x) => x.id === v);
                  setDraft({
                    ...draft,
                    productId: v,
                    newQty: p?.quantity ?? 0,
                    supplierId: p?.supplierId ?? draft.supplierId,
                    cost: p?.purchasePrice ?? draft.cost,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (qty: {p.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {open === "adjustment" ? (
              <div className="space-y-1.5">
                <Label>New Quantity</Label>
                <Input
                  type="number"
                  value={draft.newQty}
                  onChange={(e) => setDraft({ ...draft, newQty: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.quantity}
                  onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
                />
              </div>
            )}

            {open === "in" && (
              <>
                <div className="space-y-1.5">
                  <Label>Supplier</Label>
                  <Select value={draft.supplierId} onValueChange={(v) => setDraft({ ...draft, supplierId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Cost</Label>
                  <Input
                    type="number"
                    value={draft.cost}
                    onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>{open === "in" ? "Note" : "Reason"}</Label>
              <Input
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                placeholder={
                  open === "out" ? "e.g. damaged, expired, internal use" : "Optional"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "warning";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${accent === "warning" ? "text-warning" : ""}`}
      >
        {value}
      </div>
    </Card>
  );
}
