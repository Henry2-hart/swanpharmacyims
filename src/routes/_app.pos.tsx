import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2, ShoppingCart } from "lucide-react";
import { useStore } from "@/lib/store";
import type { PaymentMethod, SaleItem } from "@/lib/types";
import { currency, dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pos")({
  component: POSPage,
});

function POSPage() {
  const { products, addSale, currentUser, settings } = useStore();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(settings.taxRate);
  const [pay, setPay] = useState<PaymentMethod>("cash");
  const [receipt, setReceipt] = useState<import("@/lib/types").Sale | null>(null);

  // sync default tax when settings load
  useMemo(() => setTaxRate(settings.taxRate), [settings.taxRate]);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => p.quantity > 0)
        .filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.genericName.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 18),
    [products, q],
  );

  const add = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    setCart((c) => {
      const ex = c.find((i) => i.productId === id);
      if (ex) {
        if (ex.quantity >= p.quantity) {
          toast.error("Not enough stock");
          return c;
        }
        return c.map((i) =>
          i.productId === id
            ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.unitPrice }
            : i,
        );
      }
      return [
        ...c,
        {
          productId: p.id,
          name: p.name,
          quantity: 1,
          unitPrice: p.sellingPrice,
          lineTotal: p.sellingPrice,
        },
      ];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((c) =>
      c
        .map((i) => {
          if (i.productId !== id) return i;
          const newQ = i.quantity + delta;
          if (newQ <= 0) return null;
          const stock = products.find((p) => p.id === id)?.quantity ?? 0;
          if (newQ > stock) {
            toast.error("Not enough stock");
            return i;
          }
          return { ...i, quantity: newQ, lineTotal: newQ * i.unitPrice };
        })
        .filter(Boolean) as SaleItem[],
    );
  };

  const remove = (id: string) => setCart((c) => c.filter((i) => i.productId !== id));

  const subtotal = cart.reduce((s, i) => s + i.lineTotal, 0);
  const taxAmt = Math.round(((subtotal - discount) * taxRate) / 100);
  const total = Math.max(0, subtotal - discount + taxAmt);

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const sale = await addSale({
      items: cart,
      subtotal,
      discount,
      tax: taxAmt,
      total,
      paymentMethod: pay,
    });
    if (!sale) return toast.error("Failed to record sale");
    toast.success(`Sale ${sale.saleNumber} completed`);
    setReceipt(sale);
    setCart([]);
    setDiscount(0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                add(filtered[0].id);
                setQ("");
              }
            }}
            placeholder="Scan barcode or search products… (Enter to add first match)"
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => add(p.id)}
              className="text-left rounded-lg border p-3 hover:border-accent hover:shadow-sm transition bg-card"
            >
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.genericName}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-semibold">{currency(p.sellingPrice)}</span>
                <Badge variant="secondary" className="text-[10px]">{p.quantity} in stock</Badge>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground">
              No products available.
            </div>
          )}
        </div>
      </div>

      <Card className="p-4 flex flex-col sticky top-20 h-fit max-h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="h-4 w-4" />
          <h2 className="font-semibold">Current Sale</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            Cashier: {currentUser?.fullName}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 min-h-[120px]">
          {cart.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No items in cart.
            </div>
          )}
          {cart.map((i) => (
            <div key={i.productId} className="flex items-center gap-2 rounded-md border p-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{i.name}</div>
                <div className="text-xs text-muted-foreground">{currency(i.unitPrice)} × {i.quantity}</div>
              </div>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.productId, -1)}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm">{i.quantity}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.productId, +1)}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i.productId)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Discount</Label>
              <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tax %</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment</Label>
            <Select value={pay} onValueChange={(v) => setPay(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm space-y-1 pt-2">
            <Row label="Subtotal" value={currency(subtotal)} />
            <Row label="Discount" value={`- ${currency(discount)}`} />
            <Row label={`Tax (${taxRate}%)`} value={currency(taxAmt)} />
            <div className="flex justify-between text-base font-semibold pt-1 border-t">
              <span>Total</span>
              <span>{currency(total)}</span>
            </div>
          </div>
          <Button className="w-full mt-2" onClick={checkout}>
            Complete Sale
          </Button>
        </div>
      </Card>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="font-mono text-sm space-y-2">
              <div className="text-center">
                <div className="font-semibold">{settings.businessName}</div>
                {settings.address && <div className="text-xs text-muted-foreground">{settings.address}</div>}
                {settings.phone && <div className="text-xs text-muted-foreground">{settings.phone}</div>}
                <div className="text-xs text-muted-foreground mt-1">{dateTime(receipt.date)}</div>
                <div className="text-xs">{receipt.saleNumber}</div>
              </div>
              <div className="border-t border-dashed pt-2 space-y-1">
                {receipt.items.map((i) => (
                  <div key={i.productId} className="flex justify-between">
                    <span>{i.quantity}× {i.name}</span>
                    <span>{currency(i.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed pt-2 space-y-1">
                <Row label="Subtotal" value={currency(receipt.subtotal)} />
                <Row label="Discount" value={`- ${currency(receipt.discount)}`} />
                <Row label="Tax" value={currency(receipt.tax)} />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{currency(receipt.total)}</span>
                </div>
                <Row label="Payment" value={receipt.paymentMethod.replace("_", " ")} />
              </div>
              {settings.receiptFooter && (
                <div className="text-center text-xs text-muted-foreground pt-2 border-t border-dashed">
                  {settings.receiptFooter}
                </div>
              )}
              <div className="pt-3 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => window.print()}>
                  Print
                </Button>
                <Button className="flex-1" onClick={() => setReceipt(null)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
