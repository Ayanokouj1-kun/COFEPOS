import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  ShoppingCart,
  Package,
  Tag,
  Bell,
  Plus,
  X,
  LogOut,
  Coffee,
  Sun,
  Moon,
  Shield,
  Pencil,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

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
  const { notifications, clearNotifications, notify, isAdmin, displayName, role } = useStore();
  const { signOut } = useAuth();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showAddNotif, setShowAddNotif] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    notify(`📢 [${displayName || "Admin"}]: ${announcement.trim()}`);
    setAnnouncement("");
    setShowAddNotif(false);
    toast.success("Announcement posted!");
  };
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mias-cafe-theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("mias-cafe-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

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
    <div className="min-h-screen bg-background p-2 sm:p-4">
      <div className="mx-auto flex max-w-[1400px] flex-col overflow-hidden rounded-xl bg-card shadow-[0_20px_60px_-30px_rgba(80,50,20,0.25)] ring-1 ring-border">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-lg">
                <img src="/favicon.png" className="h-full w-full object-contain" alt="Logo" />
              </div>
              <span className="font-serif text-lg font-semibold tracking-tight">CafePOS</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {displayName || "User"}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  role === "admin" || role === "superadmin"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {role}
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-2" ref={popoverRef}>
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted cursor-pointer transition active:scale-95"
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
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
                <div className="flex items-center justify-between pb-2 border-b border-border/60 mb-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold">Notifications</p>
                    {(role === "admin" || role === "superadmin") && (
                      <button
                        onClick={() => setShowAddNotif((s) => !s)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition active:scale-95"
                        title="Write announcement"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {showAddNotif && (
                  <form onSubmit={handleAddAnnouncement} className="mb-3 space-y-1.5 pt-1">
                    <textarea
                      required
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      placeholder="Write an announcement..."
                      rows={2}
                      className="w-full rounded-md border border-border bg-card p-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddNotif(false);
                          setAnnouncement("");
                        }}
                        className="h-6 rounded border border-border px-2 text-[10px] hover:bg-muted"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-6 rounded bg-primary px-2.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                )}

                {notifications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    You're all caught up.
                  </p>
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
            {headerAction !== undefined ? (
              headerAction
            ) : isAdmin && pathname !== "/new-sale" ? (
              <Link
                to="/new-sale"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                New Sale <Plus className="h-4 w-4" />
              </Link>
            ) : null}
            <button
              onClick={signOut}
              className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-[500px] relative">
          {/* Sidebar */}
          <aside
            className={`${
              mobileOpen ? "block" : "hidden"
            } absolute inset-y-0 left-0 z-20 w-52 border-r border-border bg-card p-3 md:static md:block md:w-52 md:shrink-0`}
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
            <nav className="flex flex-col gap-1 pt-1">
              {nav.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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

              {/* SuperAdmin Panel — superadmin only */}
              {role === "superadmin" && (
                <>
                  <div className="my-1 border-t border-border/60" />
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-primary/15 text-primary"
                        : "text-primary/70 hover:bg-primary/10"
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    SuperAdmin Panel
                  </Link>
                </>
              )}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 p-4 sm:p-5">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  );
}
