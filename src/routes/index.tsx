import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import {
  DollarSign,
  ShoppingBag,
  Coffee,
  TrendingUp,
  AlertTriangle,
  Milk,
  GlassWater,
  Droplet,
  Receipt,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CafePOS" },
      {
        name: "description",
        content:
          "Café POS and inventory dashboard with today's sales, orders, and low-stock alerts.",
      },
      { property: "og:title", content: "Dashboard — CafePOS" },
      { property: "og:description", content: "Simple tools to run your café with ease." },
    ],
  }),
  component: Dashboard,
});

type Tone = "green" | "amber" | "brown" | "peach";
const toneClass: Record<Tone, string> = {
  green: "bg-stat-green text-emerald-800",
  amber: "bg-stat-amber text-amber-800",
  brown: "bg-stat-brown text-amber-900",
  peach: "bg-stat-peach text-orange-800",
};

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  tone,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  delta: string;
  tone: Tone;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneClass[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground truncate leading-none">
          {label}
        </p>
        <p className="mt-1 text-lg font-semibold tracking-tight leading-none">{value}</p>
        <p className="mt-1 text-[10px] text-muted-foreground leading-none">
          vs yesterday <span className="font-medium text-emerald-600">{delta}</span>
        </p>
      </div>
    </div>
  );
}

const getInventoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("milk")) return Milk;
  if (n.includes("cup") || n.includes("glass")) return GlassWater;
  if (n.includes("syrup") || n.includes("sauce")) return Droplet;
  return Coffee;
};

function formatTxTime(t: number) {
  const diffMs = Date.now() - t;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Dashboard() {
  const { transactions, products, voidTransaction, isAdmin, inventory } = useStore();

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.status === "low");
  }, [inventory]);

  // Scope dashboard stats to today only — keeps all reduce calls O(today's txs)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const completedTx = useMemo(
    () => transactions.filter((t) => t.status === "completed" && t.time >= todayStart),
    [transactions, todayStart],
  );

  const todaySales = useMemo(() => completedTx.reduce((sum, t) => sum + t.total, 0), [completedTx]);

  const ordersCount = useMemo(() => completedTx.length, [completedTx]);

  const productsSold = useMemo(
    () => completedTx.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0),
    [completedTx],
  );

  const estimatedProfit = useMemo(() => {
    return completedTx.reduce((sum, t) => {
      let txProfit = 0;
      t.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.id);
        const cost = prod ? prod.cost : 0;
        txProfit += item.qty * (item.price - cost);
      });
      return sum + txProfit;
    }, 0);
  }, [completedTx, products]);

  return (
    <AppLayout>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Here's what's happening in your café today.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={DollarSign}
            label="Today's Sales"
            value={`₱${todaySales.toFixed(2)}`}
            delta="+12.4%"
            tone="green"
          />
          <StatCard
            icon={ShoppingBag}
            label="Orders"
            value={ordersCount.toString()}
            delta="+8.7%"
            tone="amber"
          />
          <StatCard
            icon={Coffee}
            label="Products Sold"
            value={productsSold.toString()}
            delta="+10.3%"
            tone="brown"
          />
          <StatCard
            icon={TrendingUp}
            label="Estimated Profit"
            value={`₱${estimatedProfit.toFixed(2)}`}
            delta="+11.6%"
            tone="peach"
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Low Stock Items */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <h2 className="text-sm font-semibold">Low-stock items</h2>
                <p className="text-xs text-muted-foreground">
                  These items are running low. Consider restocking soon.
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-1.5 text-xs font-medium">Item</th>
                    <th className="pb-1.5 text-xs font-medium">Available</th>
                    <th className="pb-1.5 text-right text-xs font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((r) => {
                    const IconComponent = getInventoryIcon(r.name);
                    return (
                      <tr key={r.name} className="border-b border-border/60 last:border-0">
                        <td className="py-2">
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-foreground/60">
                              <IconComponent className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-medium text-xs">{r.name}</span>
                          </div>
                        </td>
                        <td className="py-2 text-xs font-medium text-orange-600">{r.available}</td>
                        <td className="py-2 text-right">
                          <span className="inline-flex items-center rounded-full bg-warning text-warning-foreground px-2 py-0.5 text-[10px] font-medium">
                            Low Stock
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {lowStockItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">
                        All items are fully stocked!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sales Log */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-2">
              <Receipt className="mt-0.5 h-4 w-4 text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold">Recent Sales Ledger</h2>
                <p className="text-xs text-muted-foreground">
                  Today's order history. You can void transactions here.
                </p>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-1.5 text-xs font-medium">Order ID</th>
                    <th className="pb-1.5 text-xs font-medium">Time</th>
                    <th className="pb-1.5 text-xs font-medium">Payment</th>
                    <th className="pb-1.5 text-xs font-medium">Amount</th>
                    <th className="pb-1.5 text-right text-xs font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-2">
                        <span
                          className={`font-mono text-xs font-medium ${t.status === "voided" ? "line-through text-muted-foreground" : ""}`}
                        >
                          {t.id}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{formatTxTime(t.time)}</td>
                      <td className="py-2">
                        <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                          {t.payment}
                        </span>
                      </td>
                      <td
                        className={`py-2 text-xs font-semibold ${t.status === "voided" ? "line-through text-muted-foreground font-normal" : ""}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span>₱{t.total.toFixed(2)}</span>
                          {t.discount != null && t.discount > 0 && (
                            <span className="text-[9px] font-medium text-emerald-700">
                              Senior -{t.discountPercent ?? 0}% (-₱{t.discount.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        {t.status === "completed" ? (
                          isAdmin ? (
                            <button
                              onClick={() => voidTransaction(t.id)}
                              className="h-6 rounded px-1.5 text-[10px] font-medium text-destructive hover:bg-destructive/15 border border-destructive/20 transition active:scale-95 cursor-pointer"
                            >
                              Void
                            </button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Voided
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        No transactions completed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
