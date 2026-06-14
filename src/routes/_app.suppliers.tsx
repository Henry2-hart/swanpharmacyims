import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Eye } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { currency, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_app/suppliers")({
  component: SuppliersPage,
});

const empty = (): Supplier => ({
  id: "",
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  createdAt: new Date().toISOString(),
});

function SuppliersPage() {
  const { suppliers, upsertSupplier, deleteSupplier, products, movements } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [draft, setDraft] = useState<Supplier>(empty());

  const list = useMemo(
    () =>
      suppliers.filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.contactPerson.toLowerCase().includes(q.toLowerCase()),
      ),
    [suppliers, q],
  );

  const purchases = (supplierId: string) =>
    movements.filter((m) => m.type === "in" && m.supplierId === supplierId);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input
          placeholder="Search suppliers…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Button
          className="ml-auto"
          onClick={() => {
            setDraft(empty());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Supplier
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.contactPerson}</TableCell>
                <TableCell>{s.phone}</TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell className="text-right">
                  {products.filter((p) => p.supplierId === s.id).length}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setViewing(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDraft(s);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete ${s.name}?`)) {
                        deleteSupplier(s.id);
                        toast.success("Supplier deleted");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Row label="Name">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Row>
            <Row label="Contact Person">
              <Input value={draft.contactPerson} onChange={(e) => setDraft({ ...draft, contactPerson: e.target.value })} />
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <Row label="Phone">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Row>
              <Row label="Email">
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Row>
            </div>
            <Row label="Address">
              <Textarea value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} rows={2} />
            </Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!draft.name) return toast.error("Name required");
                upsertSupplier(draft);
                toast.success("Saved");
                setOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Contact" value={viewing.contactPerson} />
                <Detail label="Phone" value={viewing.phone} />
                <Detail label="Email" value={viewing.email} />
                <Detail label="Address" value={viewing.address} />
              </div>
              <div>
                <div className="font-medium mb-2">Purchase History</div>
                <div className="rounded-md border divide-y">
                  {purchases(viewing.id).map((m) => (
                    <div key={m.id} className="flex justify-between px-3 py-2 text-sm">
                      <span>{products.find((p) => p.id === m.productId)?.name}</span>
                      <span className="text-muted-foreground">{shortDate(m.date)}</span>
                      <span>{m.quantity} units</span>
                      <span className="font-medium">{currency((m.cost ?? 0) * m.quantity)}</span>
                    </div>
                  ))}
                  {purchases(viewing.id).length === 0 && (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No purchases recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
