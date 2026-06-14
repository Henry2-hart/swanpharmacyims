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
  const { resetData, currentUser } = useStore();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Business name" value="MediStock Pharmacy" />
          <Row label="Currency" value="RWF" />
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
            <Badge className="bg-success text-success-foreground">Offline · Local cache</Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            This prototype stores data in your browser. Cloud sync activates
            automatically when the backend is connected.
          </p>
          <Button variant="outline" size="sm" onClick={() => toast.info("Will sync once cloud is connected.")}>
            <RefreshCw className="h-3 w-3 mr-1" /> Sync now
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
            Reset all demo data back to the seed (products, sales, suppliers, audit log, users).
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Reset all data to seed?")) {
                resetData();
                toast.success("Data reset");
              }
            }}
          >
            Reset demo data
          </Button>
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
