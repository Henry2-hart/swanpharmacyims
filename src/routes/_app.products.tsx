import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, Eye } from "lucide-react";
import { useStore } from "@/lib/store";
import { categories } from "@/lib/mock-data";
import type { Product } from "@/lib/types";
import { currency, daysUntil, shortDate } from "@/lib/format";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

const empty = (): Product => ({
  id: "",
  name: "",
  genericName: "",
  category: "Analgesics",
  supplierId: "",
  purchasePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  reorderLevel: 10,
  batchNumber: "",
  expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
  description: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
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
        p.batchNumber.toLowerCase().includes(q.toLowerCase());
      const matchesCat = cat === "all" || p.category === cat;
      return matchesQ && matchesCat;
    });
  }, [products, q, cat]);

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const save = () => {
    if (!draft.name) {
      toast.error("Product name is required");
      return;
    }
    const dup = products.find(
      (p) =>
        p.id !== draft.id &&
        p.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
    );
    if (dup) {
      toast.error(`A product named "${dup.name}" already exists. Use Stock In to add more quantity.`);
      return;
    }
    if (!draft.category?.trim()) {
      toast.error("Category is required");
      return;
    }
    upsertProduct({
      ...draft,
      name: draft.name.trim(),
      category: draft.category.trim(),
      expiryDate: new Date(draft.expiryDate).toISOString(),
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
            {categories.map((c) => (
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
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const days = daysUntil(p.expiryDate);
              const isOut = p.quantity === 0;
              const isLow = !isOut && p.quantity <= p.reorderLevel;
              const isExpired = days < 0;
              const isExpiring = !isExpired && days <= 90;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.genericName}</div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{supplierName(p.supplierId)}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right">{currency(p.sellingPrice)}</TableCell>
                  <TableCell>{shortDate(p.expiryDate)}</TableCell>
                  <TableCell>
                    {isOut ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : isExpired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : isLow ? (
                      <Badge className="bg-warning text-warning-foreground">Low</Badge>
                    ) : isExpiring ? (
                      <Badge variant="secondary">Expiring</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setViewing(p)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDraft({ ...p, expiryDate: p.expiryDate.slice(0, 10) });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete ${p.name}?`)) {
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
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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

            <Field label="Supplier">
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
            <Field label="Purchase Price">
              <Input
                type="number"
                value={draft.purchasePrice}
                onChange={(e) => setDraft({ ...draft, purchasePrice: Number(e.target.value) })}
              />
            </Field>
            <Field label="Selling Price">
              <Input
                type="number"
                value={draft.sellingPrice}
                onChange={(e) => setDraft({ ...draft, sellingPrice: Number(e.target.value) })}
              />
            </Field>
            <Field label="Quantity">
              <Input
                type="number"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label="Reorder Level">
              <Input
                type="number"
                value={draft.reorderLevel}
                onChange={(e) => setDraft({ ...draft, reorderLevel: Number(e.target.value) })}
              />
            </Field>
            <Field label="Batch Number">
              <Input
                value={draft.batchNumber}
                onChange={(e) => setDraft({ ...draft, batchNumber: e.target.value })}
              />
            </Field>
            <Field label="Expiry Date">
              <Input
                type="date"
                value={draft.expiryDate.slice(0, 10)}
                onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })}
              />
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
              <Detail label="Generic" value={viewing.genericName} />
              <Detail label="Category" value={viewing.category} />
              <Detail label="Supplier" value={supplierName(viewing.supplierId)} />
              <Detail label="Batch" value={viewing.batchNumber} />
              <Detail label="Purchase" value={currency(viewing.purchasePrice)} />
              <Detail label="Selling" value={currency(viewing.sellingPrice)} />
              <Detail label="Quantity" value={String(viewing.quantity)} />
              <Detail label="Reorder Level" value={String(viewing.reorderLevel)} />
              <Detail label="Expiry" value={shortDate(viewing.expiryDate)} />
              <Detail label="Updated" value={shortDate(viewing.updatedAt)} />
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
