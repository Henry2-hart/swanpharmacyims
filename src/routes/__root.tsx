import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreProvider } from "../lib/store";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "swanpharmacyims" },
      {
        name: "description",
        content:
          "Modern pharmacy inventory management and point-of-sale system with reporting and audit logs.",
      },
      { property: "og:title", content: "swanpharmacyims" },
      { name: "twitter:title", content: "swanpharmacyims" },
      { name: "description", content: "Pharmacy Flow is a desktop application for managing pharmacy inventory and processing sales." },
      { property: "og:description", content: "Pharmacy Flow is a desktop application for managing pharmacy inventory and processing sales." },
      { name: "twitter:description", content: "Pharmacy Flow is a desktop application for managing pharmacy inventory and processing sales." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7e62a03e-7ff4-4d67-9700-5c0b1c6ec10e/id-preview-bd66aa4d--86ca204b-c807-437c-b131-02cda72fec66.lovable.app-1782128701438.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7e62a03e-7ff4-4d67-9700-5c0b1c6ec10e/id-preview-bd66aa4d--86ca204b-c807-437c-b131-02cda72fec66.lovable.app-1782128701438.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a href="/" className="mt-4 inline-block text-accent underline">
          Go to dashboard
        </a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </StoreProvider>
    </QueryClientProvider>
  );
}
