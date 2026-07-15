import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore, type Product } from "@/lib/store";
import { Search, Trash2, Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CATEGORIES,
  categoryNeedsSize,
  formatPriceRange,
  getPriceForSize,
  getProductCategory,
  getSizesForCategory,
} from "@/lib/categories";
import { PLACEHOLDER_IMAGE } from "@/lib/data";

export const Route = createFileRoute("/new-sale")({
  head: () => ({
    meta: [
      { title: "New Sale — CafePOS" },
      { name: "description", content: "Ring up a new café order and complete a sale." },
      { property: "og:title", content: "New Sale — CafePOS" },
      { property: "og:description", content: "Ring up a new café order and complete a sale." },
    ],
  }),
  component: NewSale,
});

function NewSale() {
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    changeQty,
    clearCart,
    notify,
    addTransaction,
  } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sizingProduct, setSizingProduct] = useState<Product | null>(null);
  const payment = "Cash";
  const navigate = useNavigate();

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
        if (category === "All") return matchesQuery;
        const cat = getProductCategory(p.category, p.name);
        return matchesQuery && cat === category;
      }),
    [products, query, category],
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = 0;
  const total = subtotal;

  const handleProductTap = (p: Product) => {
    const cat = getProductCategory(p.category, p.name);
    if (categoryNeedsSize(cat)) {
      setSizingProduct(p);
      return;
    }
    addToCart(p);
    toast.success(`${p.name} added`);
  };

  const handlePickSize = (size: string) => {
    if (!sizingProduct) return;
    addToCart(sizingProduct, { size });
    toast.success(`${sizingProduct.name} · ${size} added`);
    setSizingProduct(null);
  };

  const complete = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty — add products first.");
      return;
    }
    addTransaction([...cart], subtotal, tax, total, payment);
    toast.success(`Sale completed · ₱${total.toFixed(2)} via ${payment}`);
    notify(
      `New order · ₱${total.toFixed(2)} · ${payment} · ${cart.reduce((s, i) => s + i.qty, 0)} item(s)`,
    );
    clearCart();
    navigate({ to: "/" });
  };

  const sizingCategory = sizingProduct
    ? getProductCategory(sizingProduct.category, sizingProduct.name)
    : null;
  const sizeChoices = sizingCategory ? getSizesForCategory(sizingCategory) : [];

  return (
    <AppLayout>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Sale</h1>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto py-1 mt-3">
            {["All", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${
                  category === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((p) => {
              const cat = getProductCategory(p.category, p.name);
              return (
                <button
                  key={p.id}
                  onClick={() => handleProductTap(p)}
                  className="rounded-lg border border-border bg-card p-2 text-left transition hover:shadow-md active:scale-[.98]"
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-muted">
                    <img
                      src={p.image || PLACEHOLDER_IMAGE}
                      alt={p.name}
                      loading="lazy"
                      width={512}
                      height={512}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-2 truncate text-xs font-medium">{p.name}</p>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <p className="text-xs text-muted-foreground">
                      {formatPriceRange({ ...p, category: cat })}
                    </p>
                    <span className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground/80">
                      {cat}
                    </span>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-xs text-muted-foreground">
                No products match "{query}".
              </p>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Order Summary</h2>
          {cart.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              No items yet. Tap a product to add it.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {cart.map((i) => (
                <li key={i.lineId} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.name}</p>
                    <div className="mt-1 inline-flex items-center rounded border border-border">
                      <button
                        onClick={() => changeQty(i.lineId, -1)}
                        className="grid h-5 w-5 place-items-center hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-5 text-center text-[10px]">{i.qty}</span>
                      <button
                        onClick={() => changeQty(i.lineId, 1)}
                        className="grid h-5 w-5 place-items-center hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">₱{(i.price * i.qty).toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(i.lineId)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
            <div className="flex justify-between pt-1.5 text-sm">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">₱{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={complete}
            className="mt-3 h-9 w-full rounded-md bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Complete Sale
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="mt-2 h-8 w-full rounded-md text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear cart
            </button>
          )}
        </aside>
      </div>

      {/* Size picker for Hot / Cold drinks */}
      {sizingProduct && sizingCategory && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSizingProduct(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose size · {sizingCategory}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight truncate">
                  {sizingProduct.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Pick a size to see its price</p>
              </div>
              <button
                onClick={() => setSizingProduct(null)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`mt-5 grid gap-2 ${sizingCategory === "Hot" ? "grid-cols-3" : "grid-cols-2"}`}>
              {sizeChoices.map((size) => {
                const price = getPriceForSize(sizingProduct, size);
                return (
                  <button
                    key={size}
                    onClick={() => handlePickSize(size)}
                    className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-muted/40 hover:border-primary hover:bg-primary/10 hover:text-primary transition active:scale-[.98]"
                  >
                    <span className="text-sm font-semibold">{size}</span>
                    <span className="text-[11px] text-muted-foreground">₱{price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground text-center">
              {sizingCategory === "Hot"
                ? "Hot drinks: 8oz, 12oz, or 16oz"
                : "Cold drinks: 12oz or 16oz"}
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
