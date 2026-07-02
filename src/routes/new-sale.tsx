import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Search, Trash2, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
  const { products, cart, addToCart, removeFromCart, changeQty, clearCart, notify } = useStore();
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("Card");
  const navigate = useNavigate();

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const complete = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty — add products first.");
      return;
    }
    toast.success(`Sale completed · $${total.toFixed(2)} via ${payment}`);
    notify(`New sale · $${total.toFixed(2)} (${payment})`);
    clearCart();
    navigate({ to: "/" });
  };

  return (
    <AppLayout>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">New Sale</h1>
          <div className="relative mt-5">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addToCart(p);
                  toast.success(`${p.name} added`);
                }}
                className="rounded-xl border border-border bg-card p-3 text-left transition hover:shadow-md active:scale-[.98]"
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
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                No products match "{query}".
              </p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No items yet. Tap a product to add it.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cart.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-border">
                      <button
                        onClick={() => changeQty(i.id, -1)}
                        className="grid h-6 w-6 place-items-center hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-6 text-center text-xs">{i.qty}</span>
                      <button
                        onClick={() => changeQty(i.id, 1)}
                        className="grid h-6 w-6 place-items-center hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${(i.price * i.qty).toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(i.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

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
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option>Card</option>
              <option>Cash</option>
              <option>Mobile</option>
            </select>
          </div>

          <button
            onClick={complete}
            className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Complete Sale
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="mt-2 h-9 w-full rounded-md text-xs text-muted-foreground hover:text-foreground"
            >
              Clear cart
            </button>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}
