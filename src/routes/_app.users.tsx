import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Pencil, Plus, Power } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Role, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const empty = (): User => ({
  id: "",
  fullName: "",
  email: "",
  phone: "",
  role: "cashier",
  status: "active",
  password: "demo",
  createdAt: new Date().toISOString(),
});

const roles: Role[] = ["owner", "manager", "cashier", "pharmacist"];

function UsersPage() {
  const { users, upsertUser, toggleUserStatus } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<User>(empty());

  const save = () => {
    if (!draft.fullName || !draft.email) return toast.error("Name and email required");
    upsertUser(draft);
    toast.success("User saved");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setDraft(empty());
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Create User
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                <TableCell>
                  {u.status === "active" ? (
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setDraft(u); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      upsertUser({ ...u, password: "demo" });
                      toast.success(`Password reset to "demo" for ${u.fullName}`);
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      toggleUserStatus(u.id);
                      toast.success("Status updated");
                    }}
                  >
                    <Power className="h-4 w-4" />
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
            <DialogTitle>{draft.id ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Row label="Full Name">
              <Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
            </Row>
            <Row label="Email">
              <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Row>
            <Row label="Phone">
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Row>
            <Row label="Role">
              <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as Role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
            <Row label="Password">
              <Input type="text" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
            </Row>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
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
