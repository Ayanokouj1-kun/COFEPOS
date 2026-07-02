import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { products } from "@/lib/data";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/new-sale")({
  head: () => ({
    meta: [
      { title: "New Sale — Mia's Café" },
      { name: "description", content: "Ring up a new café order and complete a sale." },
      { property: "og:title", content: "New Sale — Mia's Café" },
      { property: "og:description", content: "Ring up a new café order and complete a sale." },
    ],
  }),
  component: NewSale,
});

function NewSale() {
  const [cart] = useState([
    { id: "iced-latte", name: "Iced Latte", price: 4.5, qty: 1 },
    { id: "spanish-latte", name: "Spanish Latte", price: 4.75, qty: 1 },
  ]);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <AppLayout>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New Sale</h1>
          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search products..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                className="rounded-xl border border-border bg-card p-3 text-left transition hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="mt-3 text-sm font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">${p.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        <aside className="rounded-xl border border-border bg-card p-5 h-fit">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <ul className="mt-4 space-y-3">
            {cart.map((i) => (
              <li key={i.id} className="flex items-start justify-between text-sm">
                <div>
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">× {i.qty}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${i.price.toFixed(2)}</span>
                  <button className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-medium">Payment Method</label>
            <select className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">
              <option>Card</option>
              <option>Cash</option>
              <option>Mobile</option>
            </select>
          </div>

          <button className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Complete Sale
          </button>
        </aside>
      </div>
    </AppLayout>
  );
}
