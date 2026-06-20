import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Eye, Layers } from "lucide-react";
import { useStore } from "@/lib/store";
import { categories } from "@/lib/mock-data";
import type { Product } from "@/lib/types";
import { currency, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

const empty = (): Product => ({
  id: "",
  name: "",
  genericName: "",
  category: "Analgesics",
  manufacturer: "",
  dosageForm: "",
  strength: "",
  supplierId: "",
  reorderLevel: 10,
  active: true,
  description: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  quantity: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  expiryDate: "",
  batchNumber: "",
  stockValue: 0,
});

function ProductsPage() {
  const { products, suppliers, upsertProduct, deleteProduct } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Product>(empty());

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQ =
        !q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.genericName.toLowerCase().includes(q.toLowerCase()) ||
        p.manufacturer.toLowerCase().includes(q.toLowerCase());
      const matchesCat = cat === "all" || p.category === cat;
      return matchesQ && matchesCat;
    });
  }, [products, q, cat]);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const save = () => {
    if (!draft.name.trim()) return toast.error("Product name is required");
    const dup = products.find(
      (p) =>
        p.id !== draft.id &&
        p.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
    );
    if (dup) {
      toast.error(
        `A product named "${dup.name}" already exists. Add a new batch to it in Inventory.`,
      );
      return;
    }
    if (!draft.category?.trim()) return toast.error("Category is required");
    upsertProduct({
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      updatedAt: new Date().toISOString(),
    });
    toast.success("Product saved");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-8" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Array.from(new Set([...categories, ...products.map((p) => p.category)]))
              .filter(Boolean)
              .map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setDraft(empty());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Total Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Nearest Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const isOut = p.quantity === 0;
              const isLow = !isOut && p.quantity <= p.reorderLevel;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.genericName, p.strength, p.dosageForm].filter(Boolean).join(" · ")}
                    </div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.manufacturer || "—"}</TableCell>
                  <TableCell>{supplierName(p.supplierId)}</TableCell>
                  <TableCell className="text-right font-medium">{p.quantity}</TableCell>
                  <TableCell className="text-right">{currency(p.sellingPrice)}</TableCell>
                  <TableCell>{p.expiryDate ? shortDate(p.expiryDate) : "—"}</TableCell>
                  <TableCell>
                    {!p.active ? (
                      <Badge variant="secondary">Inactive</Badge>
                    ) : isOut ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : isLow ? (
                      <Badge className="bg-warning text-warning-foreground">Low</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="icon" title="Manage batches">
                      <Link to="/inventory" search={{ product: p.id } as never}>
                        <Layers className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewing(p)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDraft(p);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}? All its batches will be removed.`)) {
                          deleteProduct(p.id);
                          toast.success("Product deleted");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  No products match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Generic Name">
              <Input
                value={draft.genericName}
                onChange={(e) => setDraft({ ...draft, genericName: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Input
                list="product-categories"
                value={draft.category}
                placeholder="Select or type a category"
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
              <datalist id="product-categories">
                {Array.from(new Set([...categories, ...products.map((p) => p.category)]))
                  .filter(Boolean)
                  .map((c) => (
                    <option key={c} value={c} />
                  ))}
              </datalist>
            </Field>
            <Field label="Manufacturer">
              <Input
                value={draft.manufacturer}
                onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value })}
              />
            </Field>
            <Field label="Dosage Form">
              <Input
                placeholder="Tablet, syrup, capsule…"
                value={draft.dosageForm}
                onChange={(e) => setDraft({ ...draft, dosageForm: e.target.value })}
              />
            </Field>
            <Field label="Strength">
              <Input
                placeholder="e.g. 500mg"
                value={draft.strength}
                onChange={(e) => setDraft({ ...draft, strength: e.target.value })}
              />
            </Field>
            <Field label="Default Supplier">
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
            </Field>
            <Field label="Reorder Level">
              <Input
                type="number"
                value={draft.reorderLevel}
                onChange={(e) => setDraft({ ...draft, reorderLevel: Number(e.target.value) })}
              />
            </Field>
            <Field label="Active">
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                />
                <span className="text-sm text-muted-foreground">
                  {draft.active ? "Sellable" : "Hidden from POS"}
                </span>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <Textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Stock, batch numbers, expiry dates and pricing are managed per-batch in <b>Inventory</b>.
              Save this product first, then add a batch via the Inventory page to start stocking it.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="Generic" value={viewing.genericName || "—"} />
              <Detail label="Category" value={viewing.category} />
              <Detail label="Manufacturer" value={viewing.manufacturer || "—"} />
              <Detail label="Dosage" value={`${viewing.strength} ${viewing.dosageForm}`.trim() || "—"} />
              <Detail label="Default Supplier" value={supplierName(viewing.supplierId)} />
              <Detail label="Reorder Level" value={String(viewing.reorderLevel)} />
              <Detail label="Total Stock" value={String(viewing.quantity)} />
              <Detail label="Stock Value" value={currency(viewing.stockValue)} />
              <Detail label="Avg Cost" value={currency(viewing.purchasePrice)} />
              <Detail label="Current Price" value={currency(viewing.sellingPrice)} />
              <Detail
                label="Nearest Expiry"
                value={viewing.expiryDate ? shortDate(viewing.expiryDate) : "—"}
              />
              <Detail label="Status" value={viewing.active ? "Active" : "Inactive"} />
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">Description</div>
                <div>{viewing.description || "—"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
