import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dateTime } from "@/lib/format";
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
import type { MovementType } from "@/lib/types";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { movements, products, suppliers, addMovement } = useStore();
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

  const grouped = useMemo(
    () => ({
      in: movements.filter((m) => m.type === "in"),
      out: movements.filter((m) => m.type === "out"),
      adjustment: movements.filter((m) => m.type === "adjustment"),
      all: movements,
    }),
    [movements],
  );

  const submit = () => {
    if (!draft.productId || !open) return toast.error("Select a product");
    const product = products.find((p) => p.id === draft.productId)!;
    if (open === "adjustment") {
      addMovement({
        productId: draft.productId,
        type: "adjustment",
        quantity: draft.newQty - product.quantity,
        previousQty: product.quantity,
        newQty: draft.newQty,
        reason: draft.reason,
      });
    } else {
      addMovement({
        productId: draft.productId,
        type: open,
        quantity: draft.quantity,
        reason: draft.reason,
        supplierId: open === "in" ? draft.supplierId : undefined,
        cost: open === "in" ? draft.cost : undefined,
      });
    }
    toast.success("Movement recorded");
    setOpen(null);
    setDraft({ productId: "", quantity: 0, newQty: 0, reason: "", supplierId: "", cost: 0 });
  };

  const renderTable = (rows: typeof movements) => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Reason / Supplier</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
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
                  : m.quantity}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {m.reason ||
                  (m.supplierId
                    ? suppliers.find((s) => s.id === m.supplierId)?.name
                    : "—")}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                No records.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen("in")}>Stock In</Button>
        <Button variant="outline" onClick={() => setOpen("out")}>
          Stock Out
        </Button>
        <Button variant="outline" onClick={() => setOpen("adjustment")}>
          Adjustment
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in">Stock In</TabsTrigger>
          <TabsTrigger value="out">Stock Out</TabsTrigger>
          <TabsTrigger value="adjustment">Adjustments</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(grouped.all)}</TabsContent>
        <TabsContent value="in">{renderTable(grouped.in)}</TabsContent>
        <TabsContent value="out">{renderTable(grouped.out)}</TabsContent>
        <TabsContent value="adjustment">{renderTable(grouped.adjustment)}</TabsContent>
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
              <Select value={draft.productId} onValueChange={(v) => setDraft({ ...draft, productId: v, newQty: products.find(p=>p.id===v)?.quantity ?? 0 })}>
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
