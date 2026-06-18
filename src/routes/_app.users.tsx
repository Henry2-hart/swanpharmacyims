import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Power, ShieldCheck } from "lucide-react";
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
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const roles: Role[] = ["owner", "manager", "cashier", "pharmacist"];

function UsersPage() {
  const { users, upsertUser, toggleUserStatus, currentUser } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<User | null>(null);

  const canManage = currentUser?.role === "owner" || currentUser?.role === "manager";

  const save = async () => {
    if (!draft) return;
    if (!draft.fullName) return toast.error("Full name required");
    try {
      await upsertUser(draft);
      toast.success("User saved");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update user");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-start gap-3 bg-secondary/40">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <div className="font-medium">Staff onboarding</div>
          <p className="text-muted-foreground">
            New staff must create their own account from the sign-in page using
            their email and password. After they sign up, an Owner or Manager
            can assign their role and activate them here.
          </p>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{u.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {shortDate(u.createdAt)}
                </TableCell>
                <TableCell>
                  {u.status === "active" ? (
                    <Badge className="bg-success text-success-foreground">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canManage}
                    onClick={() => { setDraft({ ...u }); setOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!canManage || u.id === currentUser?.id}
                    onClick={async () => {
                      await toggleUserStatus(u.id);
                      toast.success("Status updated");
                    }}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No users yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <Row label="Full Name">
                <Input
                  value={draft.fullName}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                />
              </Row>
              <Row label="Email">
                <Input value={draft.email} disabled />
              </Row>
              <Row label="Phone">
                <Input
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </Row>
              <Row label="Role">
                <Select
                  value={draft.role}
                  onValueChange={(v) => setDraft({ ...draft, role: v as Role })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Status">
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as User["status"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </Row>
            </div>
          )}
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
