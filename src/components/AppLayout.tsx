import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, ShoppingCart, Package, Tag, Bell, Menu, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/new-sale", label: "New Sale", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/products", label: "Products", icon: Tag },
] as const;

export function AppLayout({
  children,
  headerAction,
}: {
  children?: ReactNode;
  headerAction?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-card shadow-[0_20px_60px_-30px_rgba(80,50,20,0.25)] ring-1 ring-border">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-md text-foreground/70 hover:bg-muted md:hidden"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              className="hidden h-9 w-9 place-items-center rounded-md text-foreground/70 hover:bg-muted md:grid"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-serif text-lg font-semibold tracking-tight">Mia's Café</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </button>
            {headerAction ?? (
              <Link
                to="/new-sale"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                New Sale <Plus className="h-4 w-4" />
              </Link>
            )}
          </div>
        </header>

        <div className="flex min-h-[720px]">
          {/* Sidebar */}
          <aside
            className={`${
              mobileOpen ? "block" : "hidden"
            } absolute z-20 mt-16 w-56 border-r border-border bg-card p-4 md:static md:mt-0 md:block md:w-60 md:shrink-0`}
          >
            <nav className="flex flex-col gap-1.5 pt-2">
              {nav.map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-active text-sidebar-active-foreground"
                        : "text-foreground/70 hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 p-5 sm:p-8">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  );
}
