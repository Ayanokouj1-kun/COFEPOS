import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { products } from "@/lib/data";
import { Plus } from "lucide-react";

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
  return (
    <AppLayout
      headerAction={
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
          Add Product <Plus className="h-4 w-4" />
        </button>
      }
    >
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
    </AppLayout>
  );
}
