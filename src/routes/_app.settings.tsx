import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Cloud, Database, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { currentUser, refresh } = useStore();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Business name" value="MediStock Pharmacy" />
          <Row label="Currency" value="TZS" />
          <Row label="Tax rate" value="5%" />
          <Row label="Signed in as" value={`${currentUser?.fullName} (${currentUser?.role})`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-4 w-4" /> Cloud Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex items-center justify-between">
            <span>Status</span>
            <Badge className="bg-success text-success-foreground">Connected</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            Data is stored securely in Lovable Cloud and synced across devices in real time.
          </p>
          <Button variant="outline" size="sm" onClick={async () => { await refresh(); toast.success("Refreshed from cloud"); }}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh now
          </Button>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            All pharmacy data is stored in your Lovable Cloud backend with role-based access control.
            Use the Products, Suppliers, and Users pages to manage records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
