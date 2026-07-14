import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  Shield,
  Users,
  Activity,
  Database,
  Trash2,
  Pencil,
  Plus,
  X,
  RefreshCw,
  Wifi,
  Package,
  Tag,
  Receipt,
  Bell,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  DollarSign,
  ShoppingBag,
  BarChart2,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Role } from "@/lib/auth";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Superadmin Panel — CafePOS" },
      { name: "description", content: "Full system control and monitoring for superadmins." },
      { property: "og:title", content: "Superadmin Panel — CafePOS" },
    ],
  }),
  component: AdminPanel,
});

/* ── Utility types ──────────────────────────────────────────── */
type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  created_at: string;
};

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string;
  record_name: string;
  deleted_by: string;
  deleted_at: string;
  snapshot: Record<string, unknown>;
};

type HealthCheck = {
  status: "ok" | "degraded" | "error" | "checking";
  pingMs: number | null;
  tableCounts: { name: string; count: number }[];
  checkedAt: number | null;
};

/* ── Helpers ────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rolePill(role: string) {
  const cls: Record<string, string> = {
    superadmin: "bg-primary/15 text-primary border border-primary/20",
    admin:
      "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    barista: "bg-muted text-muted-foreground border border-border",
  };
  return `inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls[role] ?? "bg-muted text-muted-foreground border border-border"}`;
}

function statusColors(status: HealthCheck["status"]) {
  if (status === "ok")
    return {
      dot: "bg-emerald-500",
      banner: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
      text: "text-emerald-700 dark:text-emerald-400",
    };
  if (status === "degraded")
    return {
      dot: "bg-amber-500",
      banner: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
      text: "text-amber-700 dark:text-amber-400",
    };
  if (status === "error")
    return {
      dot: "bg-red-500",
      banner: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
      text: "text-red-700 dark:text-red-400",
    };
  return {
    dot: "bg-muted-foreground animate-pulse",
    banner: "border-border bg-muted/30",
    text: "text-muted-foreground",
  };
}

/* ════════════════════════════════════════════════════════════
   ROOT COMPONENT
 ════════════════════════════════════════════════════════════ */
function AdminPanel() {
  const { role: myRole, transactions, products, inventory, notifications } = useStore();
  const { user: me, createUser } = useAuth();
  const navigate = useNavigate();

  // Guard — only superadmin
  useEffect(() => {
    if (myRole && myRole !== "superadmin") void navigate({ to: "/" });
  }, [myRole, navigate]);

  const [tab, setTab] = useState<"overview" | "users" | "audit" | "health">("overview");

  const completedTx = useMemo(
    () => transactions.filter((t) => t.status === "completed"),
    [transactions],
  );
  const totalRevenue = useMemo(() => completedTx.reduce((s, t) => s + t.total, 0), [completedTx]);

  if (myRole !== "superadmin") return null;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "users", label: "User Management" },
    { key: "audit", label: "Deletion Audit" },
    { key: "health", label: "System Health" },
  ] as const;

  return (
    <AppLayout>
      {/* Page title */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Superadmin Panel</h1>
          <p className="text-xs text-muted-foreground truncate">
            Full system control · signed in as{" "}
            <span className="font-semibold">{me?.display_name}</span>
          </p>
        </div>
        <span className={rolePill("superadmin")}>Superadmin</span>
      </div>

      {/* Quick-stat strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: DollarSign,
            label: "Total Revenue",
            value: `₱${totalRevenue.toFixed(2)}`,
            color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            icon: ShoppingBag,
            label: "Transactions",
            value: transactions.length,
            color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
          },
          {
            icon: Tag,
            label: "Products",
            value: products.length,
            color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
          },
          {
            icon: Package,
            label: "Inventory",
            value: inventory.length,
            color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{label}</p>
              <p className="text-sm font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          transactions={transactions}
          products={products}
          inventory={inventory}
          notifications={notifications}
          totalRevenue={totalRevenue}
          completedTx={completedTx}
        />
      )}
      {tab === "users" && <UsersTab me={me} createUser={createUser} />}
      {tab === "audit" && <AuditTab />}
      {tab === "health" && <HealthTab />}
    </AppLayout>
  );
}

/* ════════════════════════════════════════════════════════════
   OVERVIEW TAB
 ════════════════════════════════════════════════════════════ */
function OverviewTab({
  transactions,
  products,
  inventory,
  notifications,
  totalRevenue,
  completedTx,
}: {
  transactions: any[];
  products: any[];
  inventory: any[];
  notifications: any[];
  totalRevenue: number;
  completedTx: any[];
}) {
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    completedTx.forEach((t) => {
      (t.items as any[]).forEach((item) => {
        if (!counts[item.id]) counts[item.id] = { name: item.name, qty: 0, revenue: 0 };
        counts[item.id].qty += item.qty;
        counts[item.id].revenue += item.qty * item.price;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [completedTx]);

  const lowStock = inventory.filter((i) => i.status === "low");

  return (
    <div className="space-y-5">
      {/* Top products bar chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Top Selling Products</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No sales data yet.</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => {
              const pct = totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0;
              return (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-2">
                      <span className="text-muted-foreground text-[10px] font-mono w-4">
                        #{i + 1}
                      </span>
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ₱{p.revenue.toFixed(2)} · {p.qty} sold
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* All transactions */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">All Transactions</h2>
            <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {transactions.length} total
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-1.5 font-medium">ID</th>
                  <th className="pb-1.5 font-medium">Amount</th>
                  <th className="pb-1.5 font-medium">Method</th>
                  <th className="pb-1.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 8).map((t) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border/50 last:border-0 ${t.status === "voided" ? "opacity-50" : ""}`}
                  >
                    <td className="py-1.5 font-mono text-[11px]">{t.id}</td>
                    <td className="py-1.5 font-semibold">₱{t.total.toFixed(2)}</td>
                    <td className="py-1.5 text-muted-foreground">{t.payment}</td>
                    <td className="py-1.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          t.status === "completed"
                            ? "bg-success text-success-foreground"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts + notifications */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Alerts & Activity</h2>
          </div>

          {lowStock.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Low Stock
              </p>
              {lowStock.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className="text-xs font-semibold text-orange-600">{item.available}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Recent Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No notifications.</p>
          ) : (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id} className="text-xs py-2 border-b border-border/50 last:border-0">
                  <p className="font-medium">{n.message}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    {new Date(n.time).toLocaleTimeString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   USERS TAB
 ════════════════════════════════════════════════════════════ */
function UsersTab({ me, createUser }: { me: any; createUser: any }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    display_name: "",
    role: "barista" as Role,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, role, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setUsers(data as UserRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", password: "", display_name: "", role: "barista" });
    setShowPw(false);
    setModalOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({ username: u.username, password: "", display_name: u.display_name, role: u.role });
    setShowPw(false);
    setModalOpen(true);
  };

  const close = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.display_name.trim()) {
      toast.error("Display name is required.");
      return;
    }
    setSaving(true);

    if (editing) {
      const patch: Record<string, any> = {
        display_name: form.display_name.trim(),
        role: form.role,
      };
      if (form.password.trim()) patch.password = form.password.trim();

      const { error } = await supabase.from("users").update(patch).eq("id", editing.id);
      if (error) toast.error(error.message);
      else {
        toast.success(`${form.display_name} updated`);
        close();
        await load();
      }
    } else {
      if (!form.username.trim() || !form.password.trim()) {
        toast.error("Username and password are required.");
        setSaving(false);
        return;
      }
      const err = await createUser(
        form.username.trim(),
        form.password.trim(),
        form.display_name.trim(),
        form.role,
      );
      if (err) toast.error(err);
      else {
        toast.success(`Account created for ${form.display_name}`);
        close();
        await load();
      }
    }
    setSaving(false);
  };

  const handleDelete = (u: UserRow) => {
    if (u.id === me?.id) {
      toast.error("You can't delete your own account.");
      return;
    }
    setUserToDelete(u);
    setDeleteConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!userToDelete) return;
    const { error } = await supabase.from("users").delete().eq("id", userToDelete.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`${userToDelete.display_name} deleted`);
      await load();
    }
    setDeleteConfirmOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">User Accounts</h2>
          <p className="text-xs text-muted-foreground">
            {users.length} account{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card hover:bg-muted transition active:scale-95"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-95 transition"
          >
            <Plus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                <th className="px-4 py-3 text-xs font-medium">Name</th>
                <th className="px-4 py-3 text-xs font-medium">Username</th>
                <th className="px-4 py-3 text-xs font-medium">Role</th>
                <th className="px-4 py-3 text-xs font-medium">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-xs font-bold uppercase">
                        {u.display_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-none">{u.display_name}</p>
                        {u.id === me?.id && (
                          <span className="text-[9px] text-primary font-medium">You</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    @{u.username}
                  </td>
                  <td className="px-4 py-3">
                    <span className={rolePill(u.role)}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="grid h-7 w-7 place-items-center rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition active:scale-95"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === me?.id}
                        className="grid h-7 w-7 place-items-center rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold">
                  {editing ? "Edit Account" : "Create Account"}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {!editing && (
                <label className="block text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. barista01"
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                  />
                </label>
              )}

              <label className="block text-sm">
                <span className="text-muted-foreground">Display Name</span>
                <input
                  required
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="e.g. Mia Santos"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                />
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">
                  {editing ? "New Password (leave blank to keep)" : "Password"}
                </span>
                <div className="relative mt-1">
                  <input
                    type={showPw ? "text" : "password"}
                    required={!editing}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editing ? "Leave blank to keep current" : "Min 6 characters"}
                    className="h-10 w-full rounded-lg border border-border bg-background pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
                >
                  <option value="barista">Barista</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg border border-border px-4 text-sm hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={performDelete}
        title="Delete User Account"
        description="Are you sure you want to delete this user account? This action is permanent and cannot be undone."
        itemName={
          userToDelete ? `${userToDelete.display_name} (@${userToDelete.username})` : undefined
        }
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AUDIT LOG TAB
 ════════════════════════════════════════════════════════════ */
function AuditTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "products" | "inventory">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deletion_audit")
      .select("*")
      .order("deleted_at", { ascending: false });
    if (!error && data) setRows(data as AuditRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const restore = async (row: AuditRow) => {
    if (!confirm(`Restore "${row.record_name}" back to ${row.table_name}?`)) return;
    const pkCol = row.table_name === "products" ? "id" : "name";
    const { error } = await supabase
      .from(row.table_name)
      .update({ deleted_at: null, deleted_by: null })
      .eq(pkCol, row.record_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("deletion_audit").delete().eq("id", row.id);
    toast.success(`${row.record_name} restored`);
    await load();
  };

  const filtered = rows.filter((r) => filter === "all" || r.table_name === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Deletion Audit Log</h2>
          <p className="text-xs text-muted-foreground">
            Soft-deleted records — click a row to inspect the snapshot, restore to recover.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["all", "products", "inventory"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border hover:bg-muted transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
                  <th className="px-4 py-3 text-xs font-medium">Record</th>
                  <th className="px-4 py-3 text-xs font-medium">Table</th>
                  <th className="px-4 py-3 text-xs font-medium">Deleted By</th>
                  <th className="px-4 py-3 text-xs font-medium">When</th>
                  <th className="px-4 py-3 text-right text-xs font-medium">Restore</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expanded === r.id ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className="font-medium text-xs">{r.record_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                          {r.table_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.deleted_by}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {fmtDate(r.deleted_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void restore(r);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 transition dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="border-b border-border/50 bg-muted/20">
                        <td colSpan={5} className="px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Snapshot at deletion
                          </p>
                          <pre className="text-[11px] bg-card rounded-lg p-3 overflow-x-auto border border-border text-foreground/80 leading-relaxed">
                            {JSON.stringify(r.snapshot, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                      No deleted records{filter !== "all" ? ` in "${filter}"` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SYSTEM HEALTH TAB
 ════════════════════════════════════════════════════════════ */
function HealthTab() {
  const [health, setHealth] = useState<HealthCheck>({
    status: "checking",
    pingMs: null,
    tableCounts: [],
    checkedAt: null,
  });
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setHealth((h) => ({ ...h, status: "checking" }));

    const t0 = performance.now();
    try {
      const tables = [
        "products",
        "inventory",
        "transactions",
        "notifications",
        "users",
        "deletion_audit",
      ];

      const results = await Promise.all(
        tables.map((tbl) =>
          supabase
            .from(tbl)
            .select("*", { count: "exact", head: true })
            .then((res) => ({ name: tbl, count: res.count ?? 0, error: res.error })),
        ),
      );

      const pingMs = Math.round(performance.now() - t0);
      const hasError = results.some((r) => r.error);

      setHealth({
        status: hasError ? "degraded" : "ok",
        pingMs,
        tableCounts: results.map((r) => ({ name: r.name, count: r.count })),
        checkedAt: Date.now(),
      });
    } catch {
      setHealth({ status: "error", pingMs: null, tableCounts: [], checkedAt: Date.now() });
    }

    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const sc = statusColors(health.status);
  const statusLabel = {
    ok: "All Systems Operational",
    degraded: "Degraded — some tables may be missing",
    error: "Connection Error",
    checking: "Running checks…",
  }[health.status];

  const tableIcons: Record<string, any> = {
    products: Tag,
    inventory: Package,
    transactions: Receipt,
    notifications: Bell,
    users: Users,
    deletion_audit: Trash2,
  };

  const nav = typeof navigator !== "undefined" ? navigator : null;
  const mem = typeof performance !== "undefined" ? (performance as any).memory : null;

  return (
    <div className="space-y-5">
      {/* Status banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${sc.banner}`}>
        <span className="relative flex h-3 w-3 shrink-0">
          {health.status === "ok" && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${sc.dot} opacity-75 animate-ping`}
            />
          )}
          <span className={`relative inline-flex h-3 w-3 rounded-full ${sc.dot}`} />
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${sc.text}`}>{statusLabel}</p>
          {health.checkedAt && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Last checked {new Date(health.checkedAt).toLocaleTimeString()}
              {health.pingMs !== null && (
                <>
                  {" "}
                  · <span className="font-medium">{health.pingMs} ms</span>
                </>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Re-check"}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Table row counts */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Database Tables</h2>
          </div>
          {health.tableCounts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {checking ? "Fetching table stats…" : "Run a check to see data."}
            </div>
          ) : (
            <div className="space-y-2">
              {health.tableCounts.map(({ name, count }) => {
                const Icon = tableIcons[name] ?? Database;
                return (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 text-xs font-medium capitalize">
                      {name.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums">{count} rows</span>
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${count > 0 ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Supabase + Runtime */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Supabase Connection</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: "Host", value: "hnfugjsgqywsdxkuwmvi.supabase.co" },
                {
                  label: "Latency",
                  value: health.pingMs !== null ? `${health.pingMs} ms` : "—",
                },
                {
                  label: "Status",
                  value:
                    health.status === "ok"
                      ? "Connected ✓"
                      : health.status === "checking"
                        ? "Checking…"
                        : "Issue detected",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-border/50 pb-1.5 last:border-0 text-xs"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium text-[11px] max-w-[200px] truncate text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Runtime Info</h2>
            </div>
            <div className="space-y-2">
              {[
                {
                  label: "Browser",
                  value:
                    nav?.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[0] ?? "Unknown",
                },
                { label: "Language", value: nav?.language ?? "—" },
                { label: "Online", value: nav?.onLine ? "Yes ✓" : "Offline ✗" },
                ...(mem
                  ? [
                      {
                        label: "JS Heap Used",
                        value: `${(mem.usedJSHeapSize / 1e6).toFixed(1)} MB`,
                      },
                      {
                        label: "JS Heap Limit",
                        value: `${(mem.jsHeapSizeLimit / 1e6).toFixed(1)} MB`,
                      },
                    ]
                  : []),
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between border-b border-border/50 pb-1.5 last:border-0 text-xs"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-medium text-[11px] max-w-[180px] truncate text-right">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
