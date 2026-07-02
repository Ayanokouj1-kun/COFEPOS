import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DollarSign, ShoppingBag, Coffee, TrendingUp, AlertTriangle, Milk, GlassWater, Droplet } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mia's Café" },
      { name: "description", content: "Café POS and inventory dashboard with today's sales, orders, and low-stock alerts." },
      { property: "og:title", content: "Dashboard — Mia's Café" },
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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${toneClass[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-center text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        vs yesterday <span className="font-medium text-emerald-600">{delta}</span>
      </p>
    </div>
  );
}

const lowStock = [
  { icon: Milk, name: "Fresh Milk", available: "3 L", status: "Low Stock", tone: "warn" as const },
  { icon: GlassWater, name: "16 oz Cups", available: "24 pcs", status: "Low Stock", tone: "warn" as const },
  { icon: Droplet, name: "Vanilla Syrup", available: "0.5 L", status: "Very Low", tone: "danger" as const },
];

function Dashboard() {
  return (
    <AppLayout>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening in your café today.</p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={DollarSign} label="Today's Sales" value="$1,243.50" delta="+12.4%" tone="green" />
          <StatCard icon={ShoppingBag} label="Orders" value="86" delta="+8.7%" tone="amber" />
          <StatCard icon={Coffee} label="Products Sold" value="152" delta="+10.3%" tone="brown" />
          <StatCard icon={TrendingUp} label="Estimated Profit" value="$487.20" delta="+11.6%" tone="peach" />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <h2 className="font-semibold">Low-stock items</h2>
              <p className="text-sm text-muted-foreground">These items are running low. Consider restocking soon.</p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Available</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((r) => (
                  <tr key={r.name} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-foreground/60">
                          <r.icon className="h-4 w-4" />
                        </span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className={`py-3 font-medium ${r.tone === "danger" ? "text-red-600" : "text-orange-600"}`}>
                      {r.available}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          r.tone === "danger"
                            ? "bg-danger text-danger-foreground"
                            : "bg-warning text-warning-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
