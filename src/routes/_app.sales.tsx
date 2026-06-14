import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Printer, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { currency, dateTime } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Sale } from "@/lib/types";

export const Route = createFileRoute("/_app/sales")({
  component: SalesPage,
});

function SalesPage() {
  const { sales, users } = useStore();
  const [q, setQ] = useState("");
  const [pay, setPay] = useState<string>("all");
  const [viewing, setViewing] = useState<Sale | null>(null);

  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const matchQ =
          !q ||
          s.saleNumber.toLowerCase().includes(q.toLowerCase()) ||
          s.items.some((i) => i.name.toLowerCase().includes(q.toLowerCase()));
        const matchPay = pay === "all" || s.paymentMethod === pay;
        return matchQ && matchPay;
      }),
    [sales, q, pay],
  );

  const cashierName = (id: string) => users.find((u) => u.id === id)?.fullName ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sale number, product…" className="pl-8" />
        </div>
        <Select value={pay} onValueChange={setPay}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.saleNumber}</TableCell>
                <TableCell>{dateTime(s.date)}</TableCell>
                <TableCell>{cashierName(s.cashierId)}</TableCell>
                <TableCell className="text-right">{s.items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                <TableCell className="text-right font-semibold">{currency(s.total)}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{s.paymentMethod.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setViewing(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No sales found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.saleNumber}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{dateTime(viewing.date)}</span>
                <span>Cashier: {cashierName(viewing.cashierId)}</span>
              </div>
              <div className="rounded-md border divide-y">
                {viewing.items.map((i) => (
                  <div key={i.productId} className="flex justify-between px-3 py-2">
                    <span>{i.quantity}× {i.name}</span>
                    <span>{currency(i.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Row label="Subtotal" value={currency(viewing.subtotal)} />
                <Row label="Discount" value={`- ${currency(viewing.discount)}`} />
                <Row label="Tax" value={currency(viewing.tax)} />
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span><span>{currency(viewing.total)}</span>
                </div>
                <Row label="Payment" value={viewing.paymentMethod.replace("_", " ")} />
              </div>
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </Button>
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
      <span className="text-foreground capitalize">{value}</span>
    </div>
  );
}
