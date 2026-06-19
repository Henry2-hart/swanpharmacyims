import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { PharmacySettings } from "@/lib/types";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { currentUser, settings, updateSettings } = useStore();
  const [draft, setDraft] = useState<PharmacySettings>(settings);
  const [busy, setBusy] = useState(false);
  const canEdit = currentUser?.role === "owner" || currentUser?.role === "manager";

  useEffect(() => setDraft(settings), [settings]);

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings(draft);
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Business name">
            <Input
              value={draft.businessName}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, businessName: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={draft.phone}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={draft.email}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <Input
              value={draft.address}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </Field>
          <Field label="Default tax rate (%)">
            <Input
              type="number"
              value={draft.taxRate}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, taxRate: Number(e.target.value) })}
            />
          </Field>
          <Field label="Low-stock threshold (units)">
            <Input
              type="number"
              value={draft.lowStockThreshold}
              disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, lowStockThreshold: Number(e.target.value) })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Receipt footer">
              <Textarea
                value={draft.receiptFooter}
                disabled={!canEdit}
                rows={2}
                onChange={(e) => setDraft({ ...draft, receiptFooter: e.target.value })}
              />
            </Field>
          </div>
          <div className="md:col-span-2 flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{currentUser?.fullName}</span>{" "}
              <Badge variant="outline" className="ml-1 capitalize">{currentUser?.role}</Badge>
              <span className="ml-2">· Currency: TZS</span>
            </div>
            <Button onClick={save} disabled={!canEdit || busy}>
              <Save className="h-4 w-4 mr-2" />
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
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
