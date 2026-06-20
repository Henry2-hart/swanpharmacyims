import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal, AlertTriangle, Trash2 } from "lucide-react";
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
import type { Batch, StockTxnType } from "@/lib/types";

export const Route = createFileRoute("/_app/inventory")({
  validateSearch: (s: Record<string, unknown>) => ({
    product: typeof s.product === "string" ? s.product : undefined,
  }),
  component: InventoryPage,
});

const emptyBatch = (productId = "", supplierId = ""): Omit<Batch, "id" | "createdAt" | "availableQuantity"> => ({
  productId,
  supplierId,
  batchNumber: "",
  manufactureDate: "",
  expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  purchasePrice: 0,
  sellingPrice: 0,
  initialQuantity: 0,
  notes: "",
});

function InventoryPage() {
  const search = Route.useSearch();
  const { products, suppliers, batches, transactions, addBatch, recordTransaction } = useStore();
  const [q, setQ] = useState("");
  const [productFilter, setProductFilter] = useState<string>(search.product ?? "all");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "expiring" | "expired">("all");

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDraft, setBatchDraft] = useState(emptyBatch());

  const [adjust, setAdjust] = useState<{
    batch: Batch;
    type: StockTxnType;
    qty: number;
    reason: string;
  } | null>(null);

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const p = products.find((x) => x.id === b.productId);
      if (!p) return false;
      if (productFilter !== "all" && b.productId !== productFilter) return false;
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        b.batchNumber.toLowerCase().includes(q.toLowerCase());
      if (!matchesQ) return false;
      const days = b.expiryDate ? daysUntil(b.expiryDate) : Infinity;
      if (filter === "out") return b.availableQuantity <= 0;
      if (filter === "low")
        return b.availableQuantity > 0 && b.availableQuantity <= p.reorderLevel;
      if (filter === "expiring") return days >= 0 && days <= 90;
      if (filter === "expired") return days < 0;
      return true;
    });
  }, [batches, products, q, productFilter, filter]);

  const stats = useMemo(() => {
    const totalUnits = batches.reduce((s, b) => s + Math.max(0, b.availableQuantity), 0);
    const totalValue = batches.reduce(
      (s, b) => s + Math.max(0, b.availableQuantity) * b.purchasePrice,
      0,
    );
    const lowProducts = products.filter(
      (p) => p.quantity > 0 && p.quantity <= p.reorderLevel,
    ).length;
    const outProducts = products.filter((p) => p.quantity === 0).length;
    const expiringBatches = batches.filter((b) => {
      if (!b.expiryDate || b.availableQuantity <= 0) return false;
      const d = daysUntil(b.expiryDate);
      return d >= 0 && d <= 90;
    }).length;
    return { totalUnits, totalValue, lowProducts, outProducts, expiringBatches };
  }, [batches, products]);

  const openNewBatch = () => {
    const pid = productFilter !== "all" ? productFilter : "";
    const p = products.find((x) => x.id === pid);
    setBatchDraft(emptyBatch(pid, p?.supplierId ?? ""));
    setBatchOpen(true);
  };

  const saveBatch = async () => {
    if (!batchDraft.productId) return toast.error("Choose a product");
    if (!batchDraft.batchNumber.trim()) return toast.error("Batch number is required");
    if (batchDraft.initialQuantity <= 0)
      return toast.error("Initial quantity must be greater than 0");
    if (batchDraft.purchasePrice < 0 || batchDraft.sellingPrice < 0)
      return toast.error("Prices must be positive");
    const created = await addBatch(batchDraft);
    if (!created) return toast.error("Failed to save batch");
    toast.success("Batch added");
    setBatchOpen(false);
  };

  const submitAdjust = async () => {
    if (!adjust) return;
    const { batch, type, qty, reason } = adjust;
    if (qty <= 0) return toast.error("Quantity must be greater than 0");
    let delta = 0;
    if (type === "return" || type === "adjustment") delta = qty; // adjustment treated as +; for - use damage/expired
    else if (type === "damage" || type === "expired") {
      if (qty > batch.availableQuantity) return toast.error("Not enough stock in this batch");
      delta = -qty;
    } else if (type === "purchase") delta = qty;
    await recordTransaction(batch.id, type, delta, {
      unitCost: type === "purchase" ? batch.purchasePrice : null,
      reference: reason,
    });
    toast.success("Stock updated");
    setAdjust(null);
  };

  const batchBadge = (b: Batch) => {
    const days = b.expiryDate ? daysUntil(b.expiryDate) : Infinity;
    if (b.availableQuantity <= 0) return <Badge variant="destructive">Empty</Badge>;
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 90) return <Badge variant="secondary">Expiring</Badge>;
    return <Badge className="bg-success text-success-foreground">In stock</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Units" value={stats.totalUnits.toLocaleString()} />
        <StatCard label="Stock Value" value={currency(stats.totalValue)} />
        <StatCard
          label="Low Stock Products"
          value={String(stats.lowProducts)}
          accent={stats.lowProducts > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Out of Stock"
          value={String(stats.outProducts)}
          accent={stats.outProducts > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Expiring Batches"
          value={String(stats.expiringBatches)}
          accent={stats.expiringBatches > 0 ? "warning" : "default"}
        />
      </div>

      <Tabs defaultValue="batches">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={openNewBatch}>
            <Plus className="h-4 w-4 mr-1" /> Add Batch
          </Button>
        </div>

        <TabsContent value="batches" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by product or batch number…"
                className="pl-8"
              />
            </div>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Empty</SelectItem>
                <SelectItem value="expiring">Expiring (≤90d)</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{productName(b.productId)}</TableCell>
                    <TableCell className="text-muted-foreground">{b.batchNumber}</TableCell>
                    <TableCell>
                      {suppliers.find((s) => s.id === b.supplierId)?.name ?? "—"}
                    </TableCell>
                    <TableCell>{b.expiryDate ? shortDate(b.expiryDate) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{b.availableQuantity}</TableCell>
                    <TableCell className="text-right">{currency(b.purchasePrice)}</TableCell>
                    <TableCell className="text-right">{currency(b.sellingPrice)}</TableCell>
                    <TableCell className="text-right">
                      {currency(Math.max(0, b.availableQuantity) * b.purchasePrice)}
                    </TableCell>
                    <TableCell>{batchBadge(b)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Adjust"
                        onClick={() =>
                          setAdjust({ batch: b, type: "adjustment", qty: 0, reason: "" })
                        }
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Damage / Loss"
                        onClick={() =>
                          setAdjust({ batch: b, type: "damage", qty: 0, reason: "" })
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Mark expired"
                        onClick={() =>
                          setAdjust({
                            batch: b,
                            type: "expired",
                            qty: b.availableQuantity,
                            reason: "Expired stock",
                          })
                        }
                      >
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBatches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                      No batches yet. Add one with the “Add Batch” button.
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
                  <TableHead>Batch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => {
                  const b = batches.find((x) => x.id === t.batchId);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{dateTime(t.createdAt)}</TableCell>
                      <TableCell>{productName(t.productId)}</TableCell>
                      <TableCell className="text-muted-foreground">{b?.batchNumber ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            t.quantityChange > 0
                              ? "bg-success text-success-foreground"
                              : t.quantityChange < 0
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-accent text-accent-foreground"
                          }
                        >
                          {t.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.unitCost != null ? currency(t.unitCost) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.reference || "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      No stock movements yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New batch dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Batch</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Product</Label>
              <Select
                value={batchDraft.productId}
                onValueChange={(v) => {
                  const p = products.find((x) => x.id === v);
                  setBatchDraft({
                    ...batchDraft,
                    productId: v,
                    supplierId: batchDraft.supplierId || (p?.supplierId ?? ""),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Batch Number</Label>
              <Input
                value={batchDraft.batchNumber}
                onChange={(e) => setBatchDraft({ ...batchDraft, batchNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select
                value={batchDraft.supplierId}
                onValueChange={(v) => setBatchDraft({ ...batchDraft, supplierId: v })}
              >
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
              <Label>Manufacture Date</Label>
              <Input
                type="date"
                value={batchDraft.manufactureDate.slice(0, 10)}
                onChange={(e) =>
                  setBatchDraft({ ...batchDraft, manufactureDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={batchDraft.expiryDate.slice(0, 10)}
                onChange={(e) => setBatchDraft({ ...batchDraft, expiryDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Price (per unit)</Label>
              <Input
                type="number"
                value={batchDraft.purchasePrice}
                onChange={(e) =>
                  setBatchDraft({ ...batchDraft, purchasePrice: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Selling Price (per unit)</Label>
              <Input
                type="number"
                value={batchDraft.sellingPrice}
                onChange={(e) =>
                  setBatchDraft({ ...batchDraft, sellingPrice: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Quantity</Label>
              <Input
                type="number"
                min={1}
                value={batchDraft.initialQuantity}
                onChange={(e) =>
                  setBatchDraft({ ...batchDraft, initialQuantity: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={batchDraft.notes}
                onChange={(e) => setBatchDraft({ ...batchDraft, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBatch}>Save Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust / damage / expired dialog */}
      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjust?.type === "damage" && "Record Damage / Loss"}
              {adjust?.type === "expired" && "Mark as Expired"}
              {adjust?.type === "adjustment" && "Stock Adjustment"}
              {adjust?.type === "return" && "Record Return"}
              {adjust?.type === "purchase" && "Record Purchase"}
            </DialogTitle>
          </DialogHeader>
          {adjust && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{productName(adjust.batch.productId)}</div>
                <div className="text-xs text-muted-foreground">
                  Batch {adjust.batch.batchNumber} · Available: {adjust.batch.availableQuantity}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Movement Type</Label>
                <Select
                  value={adjust.type}
                  onValueChange={(v: StockTxnType) => setAdjust({ ...adjust, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adjustment">Adjustment (+)</SelectItem>
                    <SelectItem value="return">Return (+)</SelectItem>
                    <SelectItem value="damage">Damage / Loss (−)</SelectItem>
                    <SelectItem value="expired">Expired (−)</SelectItem>
                    <SelectItem value="purchase">Additional Purchase (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={adjust.qty}
                  onChange={(e) => setAdjust({ ...adjust, qty: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Reference</Label>
                <Input
                  value={adjust.reason}
                  onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>
              Cancel
            </Button>
            <Button onClick={submitAdjust}>Save</Button>
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
      <div className={`mt-1 text-2xl font-semibold ${accent === "warning" ? "text-warning" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
