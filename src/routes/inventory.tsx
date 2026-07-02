import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Coffee, Milk, GlassWater, Droplet, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const { inventory, addStock } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", available: "", status: "in" as "in" | "low" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.available.trim()) {
      toast.error("Enter an item name and quantity.");
      return;
    }
    addStock({ name: form.name.trim(), available: form.available.trim(), status: form.status });
    toast.success(`${form.name} stock updated`);
    setForm({ name: "", available: "", status: "in" });
    setOpen(false);
  };

  const addBtn = (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Stock <Plus className="h-4 w-4" />
    </button>
  );

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>

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

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Stock</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Item name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Fresh Milk"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Available</span>
                <input
                  value={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.value })}
                  placeholder="e.g. 5 L or 24 pcs"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "in" | "low" })}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="in">In Stock</option>
                  <option value="low">Low Stock</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
