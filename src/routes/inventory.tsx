import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { inventory } from "@/lib/data";
import { Coffee, Milk, GlassWater, Droplet, Plus } from "lucide-react";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Mia's Café" },
      { name: "description", content: "Track café stock levels and add new inventory." },
      { property: "og:title", content: "Inventory — Mia's Café" },
      { property: "og:description", content: "Track café stock levels and add new inventory." },
    ],
  }),
  component: Inventory,
});

const iconFor: Record<string, typeof Coffee> = {
  "Coffee Beans": Coffee,
  "Fresh Milk": Milk,
  "16 oz Cups": GlassWater,
  "Bottled Water": Droplet,
};

function Inventory() {
  return (
    <AppLayout
      headerAction={
        <button className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
          Add Stock <Plus className="h-4 w-4" />
        </button>
      }
    >
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 md:hidden">
          Add Stock <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card p-5 sm:p-6">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-3 font-medium">Item</th>
              <th className="pb-3 font-medium">Available</th>
              <th className="pb-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((r) => {
              const Icon = iconFor[r.name] ?? Coffee;
              return (
                <tr key={r.name} className="border-b border-border/60 last:border-0">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-muted text-foreground/60">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </td>
                  <td className={`py-4 font-medium ${r.status === "low" ? "text-orange-600" : ""}`}>
                    {r.available}
                  </td>
                  <td className="py-4 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.status === "low"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground"
                      }`}
                    >
                      {r.status === "low" ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
