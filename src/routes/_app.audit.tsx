import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { dateTime } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { audit, users } = useStore();
  const [q, setQ] = useState("");
  const name = (id: string) => users.find((u) => u.id === id)?.fullName ?? id;
  const filtered = useMemo(
    () =>
      audit.filter(
        (a) =>
          !q ||
          a.action.toLowerCase().includes(q.toLowerCase()) ||
          (a.detail ?? "").toLowerCase().includes(q.toLowerCase()) ||
          name(a.userId).toLowerCase().includes(q.toLowerCase()),
      ),
    [audit, q, users],
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search action, user, detail…"
        className="max-w-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap">{dateTime(a.timestamp)}</TableCell>
                <TableCell>{name(a.userId)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{a.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{a.detail}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  No audit entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
