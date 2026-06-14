import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useStore } from "@/lib/store";

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
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("pharma-session-v1");
    if (!raw) throw redirect({ to: "/auth" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { currentUser } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    titles[pathname] ??
    titles[Object.keys(titles).find((k) => k !== "/" && pathname.startsWith(k)) ?? ""] ??
    "MediStock";

  if (!currentUser) return null;

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
