import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & Costing — Mia's Café" },
      { name: "description", content: "Manage café menu items, prices, and cost margins." },
      { property: "og:title", content: "Products & Costing — Mia's Café" },
      { property: "og:description", content: "Manage café menu items, prices, and cost margins." },
    ],
  }),
  component: Products,
});

function Products() {
  const { products, addProduct } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", cost: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const cost = Number(form.cost);
    if (!form.name.trim() || Number.isNaN(price) || Number.isNaN(cost)) {
      toast.error("Enter a name, price, and cost.");
      return;
    }
    addProduct({ name: form.name.trim(), price, cost });
    toast.success(`${form.name} added to menu`);
    setForm({ name: "", price: "", cost: "" });
    setOpen(false);
  };

  const addBtn = (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Product <Plus className="h-4 w-4" />
    </button>
  );

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-3xl font-semibold tracking-tight">Products &amp; Costing</h1>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const profit = p.price - p.cost;
          return (
            <div key={p.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Price</dt>
                    <dd className="font-medium">${p.price.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Cost</dt>
                    <dd className="font-medium">${p.cost.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between pt-1">
                    <dt className="font-medium">Profit</dt>
                    <dd className="font-semibold text-emerald-700">${profit.toFixed(2)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Product</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cappuccino"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Price ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Cost ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </label>
              </div>
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
