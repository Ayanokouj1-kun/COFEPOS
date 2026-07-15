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
  Sun,
  Moon,
  Shield,
  Pencil,
  ShoppingBag,
  Megaphone,
  CheckCheck,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, type Notification } from "@/lib/store";
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

function formatFullDate(t: number) {
  return new Date(t).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Split ecommerce-style "Title · detail · detail" messages for the modal */
function parseNotification(message: string) {
  const parts = message.split(" · ").map((p) => p.trim()).filter(Boolean);
  const head = (parts[0] || "Notification").toLowerCase();

  if (head.startsWith("new order") || head.startsWith("order")) {
    return {
      kind: "order" as const,
      title: parts[0] || "New order",
      subtitle: parts.slice(1).join(" · ") || "Sale completed successfully",
      body: message,
    };
  }

  if (head.startsWith("staff update") || head.startsWith("announcement")) {
    const from = parts[1] ? `From ${parts[1].replace(/^from\s+/i, "")}` : "Team announcement";
    const body = parts.slice(2).join(" · ") || parts.slice(1).join(" · ") || message;
    return {
      kind: "announce" as const,
      title: parts[0] || "Staff update",
      subtitle: from,
      body,
    };
  }

  return {
    kind: "general" as const,
    title: parts[0] || "Notification",
    subtitle: parts.slice(1).join(" · ") || "CafePOS alert",
    body: parts.length > 1 ? parts.slice(1).join(" · ") : message,
  };
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
  const {
    notifications,
    unreadCount,
    clearNotifications,
    notify,
    isAdmin,
    displayName,
    role,
    isNotificationRead,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();
  const { signOut } = useAuth();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [showAddNotif, setShowAddNotif] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [readingNotif, setReadingNotif] = useState<Notification | null>(null);

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    notify(`Staff update · ${displayName || "Admin"} · ${announcement.trim()}`);
    setAnnouncement("");
    setShowAddNotif(false);
    toast.success("Announcement posted");
  };

  const openNotification = (n: Notification) => {
    markNotificationRead(n.id);
    setReadingNotif(n);
    setNotifOpen(false);
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

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const readingMeta = readingNotif ? parseNotification(readingNotif.message) : null;

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
              className="relative grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted cursor-pointer transition active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                  {badgeLabel}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-30 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-0 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight">Notifications</p>
                    <p className="text-[11px] text-muted-foreground">
                      {unreadCount > 0
                        ? `${unreadCount} unread`
                        : notifications.length > 0
                          ? "You're all caught up"
                          : "No messages yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {(role === "admin" || role === "superadmin") && (
                      <button
                        onClick={() => setShowAddNotif((s) => !s)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition active:scale-95"
                        title="Write announcement"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-primary hover:bg-primary/10 cursor-pointer transition"
                        title="Mark all as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark all</span>
                      </button>
                    )}
                    {isAdmin && notifications.length > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {showAddNotif && (
                  <form
                    onSubmit={handleAddAnnouncement}
                    className="space-y-2 border-b border-border bg-muted/30 px-4 py-3"
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Post a staff announcement
                    </p>
                    <textarea
                      required
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      placeholder="e.g. Please restock oat milk before closing…"
                      rows={3}
                      className="w-full rounded-lg border border-border bg-card p-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddNotif(false);
                          setAnnouncement("");
                        }}
                        className="h-8 rounded-lg border border-border px-3 text-[11px] hover:bg-muted cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-8 rounded-lg bg-primary px-3.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      >
                        Post update
                      </button>
                    </div>
                  </form>
                )}

                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-muted">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No notifications</p>
                    <p className="text-xs text-muted-foreground max-w-[220px]">
                      Orders and staff updates will show up here.
                    </p>
                  </div>
                ) : (
                  <ul className="max-h-[22rem] overflow-y-auto">
                    {notifications.map((n) => {
                      const unread = !isNotificationRead(n.id);
                      const meta = parseNotification(n.message);
                      const Icon =
                        meta.kind === "order"
                          ? ShoppingBag
                          : meta.kind === "announce"
                            ? Megaphone
                            : Bell;
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => openNotification(n)}
                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition cursor-pointer hover:bg-muted/70 ${
                              unread ? "bg-primary/[0.06]" : ""
                            }`}
                          >
                            <div
                              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                                meta.kind === "order"
                                  ? "bg-stat-green/15 text-stat-green"
                                  : meta.kind === "announce"
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-xs leading-snug line-clamp-1 ${
                                    unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                                  }`}
                                >
                                  {meta.title}
                                </p>
                                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                                  {formatAgo(n.time)}
                                </span>
                              </div>
                              <p
                                className={`mt-0.5 text-[11px] leading-relaxed line-clamp-2 ${
                                  unread ? "text-foreground/75" : "text-muted-foreground"
                                }`}
                              >
                                {meta.subtitle || meta.body}
                              </p>
                            </div>
                            {unread && (
                              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                            )}
                          </button>
                        </li>
                      );
                    })}
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
              className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 hover:bg-muted cursor-pointer transition active:scale-95"
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

          <main className="flex-1 p-4 sm:p-5">{children ?? <Outlet />}</main>
        </div>
      </div>

      {/* Ecommerce-style notification detail modal */}
      {readingNotif && readingMeta && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 p-0 sm:p-6 backdrop-blur-[2px]"
          onClick={() => setReadingNotif(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 overflow-hidden"
          >
            <div className="relative border-b border-border bg-gradient-to-br from-primary/10 via-card to-card px-6 pt-6 pb-5">
              <button
                onClick={() => setReadingNotif(null)}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background border border-border/60 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${
                    readingMeta.kind === "order"
                      ? "bg-stat-green/15 text-stat-green"
                      : readingMeta.kind === "announce"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {readingMeta.kind === "order" ? (
                    <ShoppingBag className="h-7 w-7" />
                  ) : readingMeta.kind === "announce" ? (
                    <Megaphone className="h-7 w-7" />
                  ) : (
                    <Bell className="h-7 w-7" />
                  )}
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {readingMeta.kind === "order"
                      ? "Order notification"
                      : readingMeta.kind === "announce"
                        ? "Staff announcement"
                        : "Notification"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                    {readingMeta.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{readingMeta.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Details
                </p>
                <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {readingMeta.body}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{formatFullDate(readingNotif.time)}</span>
                <span className="text-border">·</span>
                <span>{formatAgo(readingNotif.time)}</span>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Marked as read
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
              <button
                onClick={() => setReadingNotif(null)}
                className="h-11 min-w-[120px] rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
