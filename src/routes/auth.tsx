import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Pill } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("pharma-session-v1")) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

const demo = [
  { role: "Owner", email: "owner@pharma.app" },
  { role: "Manager", email: "manager@pharma.app" },
  { role: "Cashier", email: "cashier@pharma.app" },
  { role: "Pharmacist", email: "pharmacist@pharma.app" },
];

function AuthPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("owner@pharma.app");
  const [password, setPassword] = useState("demo");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = login(email, password);
    if (u) {
      toast.success(`Welcome back, ${u.fullName.split(" ")[0]}`);
      navigate({ to: "/" });
    } else {
      toast.error("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-foreground/10">
            <Pill className="h-6 w-6" />
          </div>
          <span className="text-xl font-semibold">MediStock</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Run your pharmacy with clarity.
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Inventory, point of sale, suppliers, expiry tracking, and reporting —
            in one calm, offline-first workspace.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/80">
            <li>• Real-time stock and expiry alerts</li>
            <li>• Role-based access for owners, managers, cashiers, pharmacists</li>
            <li>• Audit log for every important action</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} MediStock Pharmacy Suite
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Pill className="h-6 w-6" />
            </div>
            <span className="text-xl font-semibold">MediStock</span>
          </div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use one of the demo accounts below or your team credentials.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Demo accounts (password: demo)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demo.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword("demo");
                  }}
                  className="rounded-md border px-3 py-2 text-left text-xs hover:bg-secondary"
                >
                  <div className="font-medium">{d.role}</div>
                  <div className="text-muted-foreground truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
