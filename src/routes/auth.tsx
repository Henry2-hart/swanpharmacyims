import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const LOCKOUT_KEY = "medistock_login_lockout";
const ATTEMPTS_KEY = "medistock_login_attempts";
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 120;

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  // sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // sign up
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  // Tick lockout timer
  useEffect(() => {
    const tick = () => {
      const until = Number(localStorage.getItem(LOCKOUT_KEY) || 0);
      const rem = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLockRemaining(rem);
      if (rem === 0 && until) {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const markSessionActive = () => {
    sessionStorage.setItem("medistock_session_active", "1");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const until = Number(localStorage.getItem(LOCKOUT_KEY) || 0);
    if (until > Date.now()) {
      toast.error(`Too many attempts. Try again in ${Math.ceil((until - Date.now()) / 1000)}s.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      const attempts = Number(localStorage.getItem(ATTEMPTS_KEY) || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_SECONDS * 1000;
        localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
        localStorage.setItem(ATTEMPTS_KEY, "0");
        setLockRemaining(LOCKOUT_SECONDS);
        toast.error(`Locked for ${LOCKOUT_SECONDS}s after ${MAX_ATTEMPTS} failed attempts.`);
      } else {
        localStorage.setItem(ATTEMPTS_KEY, String(attempts));
        toast.error(`${error.message} (${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left)`);
      }
      return;
    }
    localStorage.removeItem(ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
    markSessionActive();
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Signing you in…");
    const { error: signinErr } = await supabase.auth.signInWithPassword({
      email: signupEmail,
      password: signupPassword,
    });
    if (signinErr) return toast.error(signinErr.message);
    markSessionActive();
    navigate({ to: "/" });
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
            in one calm workspace.
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

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <h1 className="text-2xl font-semibold mt-4">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your staff email.
              </p>
              <form onSubmit={signIn} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={lockRemaining > 0} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={lockRemaining > 0} />
                </div>
                {lockRemaining > 0 && (
                  <p className="text-sm text-destructive">
                    Locked due to failed attempts. Try again in {lockRemaining}s.
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={busy || lockRemaining > 0}>
                  {lockRemaining > 0 ? `Locked (${lockRemaining}s)` : busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <h1 className="text-2xl font-semibold mt-4">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The first account becomes the pharmacy <strong>Owner</strong>.
                Other staff need a role assigned by an Owner or Manager.
              </p>
              <form onSubmit={signUp} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fn">Full name</Label>
                  <Input id="fn" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se">Email</Label>
                  <Input id="se" type="email" required value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ph">Phone</Label>
                  <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sp">Password</Label>
                  <Input id="sp" type="password" required minLength={6} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
