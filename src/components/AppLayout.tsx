import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, ShoppingCart, Package, Tag, Bell, Menu, Plus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/new-sale", label: "New Sale", icon: ShoppingCart },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/products", label: "Products", icon: Tag },
] as const;

function formatAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function AppLayout({
  children,
  headerAction,
}: {
  children?: ReactNode;
  headerAction?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, clearNotifications } = useStore();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-card shadow-[0_20px_60px_-30px_rgba(80,50,20,0.25)] ring-1 ring-border">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-md text-foreground/70 hover:bg-muted"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-serif text-lg font-semibold tracking-tight">Mia's Café</span>
          </div>
          <div className="relative flex items-center gap-3" ref={popoverRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-30 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id} className="rounded-md px-2 py-2 text-sm hover:bg-muted">
                        <p>{n.message}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatAgo(n.time)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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

        <div className="flex min-h-[720px] relative">
          {/* Sidebar */}
          <aside
            className={`${
              mobileOpen ? "block" : "hidden"
            } absolute inset-y-0 left-0 z-20 w-56 border-r border-border bg-card p-4 md:static md:block md:w-60 md:shrink-0`}
          >
            <div className="flex items-center justify-end md:hidden">
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
