import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/inventory": "Inventory",
  "/suppliers": "Suppliers",
  "/pos": "Point of Sale",
  "/sales": "Sales",
  "/reports": "Reports",
  "/users": "User Management",
  "/audit": "Audit Logs",
  "/settings": "Settings",
};

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { currentUser, loading } = useStore();
  const navigate = useNavigate();
  const [checkedAuth, setCheckedAuth] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    titles[pathname] ??
    titles[Object.keys(titles).find((k) => k !== "/" && pathname.startsWith(k)) ?? ""] ??
    "MediStock";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      // Require re-login when the browser session marker is missing
      // (sessionStorage clears on tab/window close but survives refresh).
      const marker = sessionStorage.getItem("medistock_session_active");
      if (data.session && !marker) {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
        setCheckedAuth(true);
        return;
      }
      if (!data.session) navigate({ to: "/auth" });
      setCheckedAuth(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        sessionStorage.removeItem("medistock_session_active");
        navigate({ to: "/auth" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!checkedAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-xl font-semibold mb-2">No role assigned</h1>
        <p className="text-muted-foreground text-sm max-w-md">
          Your account exists but no role has been assigned yet. Ask an Owner or
          Manager to assign you a role.
        </p>
        <button
          className="mt-4 text-sm text-accent underline"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar role={currentUser.role} />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
