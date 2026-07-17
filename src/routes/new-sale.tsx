import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore, type Product } from "@/lib/store";
import { Search, Trash2, Minus, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  activeCategories,
  activeSyrups,
  categoryHasVariants,
  formatPriceRange,
  getSizesForVariant,
  getUnitPrice,
  variantNeedsSize,
  variantsForCategory,
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

type PickStep = "variant" | "size" | "syrup";

/** Shared brown hover / click — matches category filter buttons */
const filterIdle =
  "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50";
const filterSelected = "border-primary bg-primary text-primary-foreground";
const tapBrown =
  "transition hover:border-primary/40 hover:bg-muted/50 active:border-primary active:bg-primary active:text-primary-foreground active:scale-[.98]";

function NewSale() {
  const {
    products,
    menuCategories,
    categoryVariants,
    syrups,
    cart,
    addToCart,
    removeFromCart,
    changeQty,
    clearCart,
    notify,
    addTransaction,
    seniorDiscountPercent,
  } = useStore();

  const categories = useMemo(() => activeCategories(menuCategories), [menuCategories]);
  const enabledSyrups = useMemo(() => activeSyrups(syrups), [syrups]);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [pickingProduct, setPickingProduct] = useState<Product | null>(null);
  const [pickStep, setPickStep] = useState<PickStep | null>(null);
  const [pickedVariantId, setPickedVariantId] = useState<string | undefined>();
  const [pickedSize, setPickedSize] = useState<string | undefined>();
  const [seniorDiscount, setSeniorDiscount] = useState(false);
  const payment = "Cash";
  const navigate = useNavigate();

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase());
        if (categoryFilter === "All") return matchesQuery;
        return matchesQuery && p.categoryId === categoryFilter;
      }),
    [products, query, categoryFilter],
  );

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = seniorDiscount
    ? Math.round(subtotal * (seniorDiscountPercent / 100) * 100) / 100
    : 0;
  const tax = 0;
  const total = Math.max(0, subtotal - discount + tax);

  const getCategory = (categoryId: string) => categories.find((c) => c.id === categoryId);

  const closePicker = () => {
    setPickingProduct(null);
    setPickStep(null);
    setPickedVariantId(undefined);
    setPickedSize(undefined);
  };

  const finishAdd = (variantId?: string, size?: string, syrupId?: string) => {
    if (!pickingProduct) return;
    addToCart(pickingProduct, { variantId, size, syrupId });
    toast.success(`${pickingProduct.name} added`);
    closePicker();
  };

  const handleProductTap = (p: Product) => {
    const cat = getCategory(p.categoryId);
    const hasVariants = categoryHasVariants(p.categoryId, categoryVariants);

    if (hasVariants) {
      setPickingProduct(p);
      setPickStep("variant");
      setPickedVariantId(undefined);
      return;
    }

    if (cat?.supports_syrup && enabledSyrups.length > 0) {
      setPickingProduct(p);
      setPickStep("syrup");
      setPickedVariantId(undefined);
      return;
    }

    addToCart(p);
    toast.success(`${p.name} added`);
  };

  const goToSyrupOrFinish = (variantId?: string, size?: string) => {
    if (!pickingProduct) return;
    const cat = getCategory(pickingProduct.categoryId);
    if (cat?.supports_syrup && enabledSyrups.length > 0) {
      setPickedVariantId(variantId);
      setPickedSize(size);
      setPickStep("syrup");
      return;
    }
    finishAdd(variantId, size);
  };

  const handlePickVariant = (variantId: string) => {
    if (!pickingProduct) return;
    if (variantNeedsSize(pickingProduct.categoryId, variantId)) {
      setPickedVariantId(variantId);
      setPickStep("size");
      return;
    }
    goToSyrupOrFinish(variantId);
  };

  const handlePickSize = (size: string) => {
    goToSyrupOrFinish(pickedVariantId, size);
  };

  const handlePickSyrup = (syrupId?: string) => {
    finishAdd(pickedVariantId, pickedSize, syrupId);
  };

  const complete = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty — add products first.");
      return;
    }
    addTransaction(
      [...cart],
      subtotal,
      discount,
      tax,
      total,
      payment,
      seniorDiscount
        ? { seniorDiscount: true, discountPercent: seniorDiscountPercent }
        : undefined,
    );
    toast.success(`Sale completed · ₱${total.toFixed(2)}`);
    notify(
      `New order · ₱${total.toFixed(2)} · ${payment}${seniorDiscount ? ` · Senior -${seniorDiscountPercent}%` : ""} · ${cart.reduce((s, i) => s + i.qty, 0)} item(s)`,
    );
    clearCart();
    setSeniorDiscount(false);
    navigate({ to: "/" });
  };

  const variantChoices = pickingProduct
    ? variantsForCategory(pickingProduct.categoryId, categoryVariants)
    : [];
  const sizeChoices =
    pickingProduct && pickedVariantId
      ? getSizesForVariant(pickingProduct.categoryId, pickedVariantId)
      : [];

  return (
    <AppLayout>
      {/* Full-height POS layout — nothing overflows the viewport */}
      <div className="flex h-[calc(100dvh-8.5rem)] min-h-[320px] flex-col gap-2 overflow-hidden lg:flex-row lg:gap-3">
        {/* Products panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Toolbar: title + search */}
          <div className="flex shrink-0 items-center gap-2">
            <h1 className="hidden text-sm font-semibold sm:block shrink-0">New Sale</h1>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-7 w-full rounded-md border border-border bg-card pl-7 pr-2 text-[11px] outline-none focus:ring-1 focus:ring-ring/40"
              />
            </div>
          </div>

          {/* Category filters — 5-column compact boxes */}
          <div className="shrink-0 grid grid-cols-5 gap-1 py-0.5">
            <button
              onClick={() => setCategoryFilter("All")}
              className={`flex h-9 items-center justify-center rounded-md border px-1 text-center text-[9px] font-semibold leading-tight transition sm:text-[10px] ${
                categoryFilter === "All" ? filterSelected : filterIdle
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex h-9 items-center justify-center rounded-md border px-1 text-center text-[9px] font-semibold leading-tight transition sm:text-[10px] ${
                  categoryFilter === cat.id ? filterSelected : filterIdle
                }`}
              >
                <span className="line-clamp-2">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Product grid — 5 columns, proper cards with clear photos */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="grid grid-cols-5 gap-2 pb-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProductTap(p)}
                  className={`group flex flex-col overflow-hidden rounded-lg border bg-card p-2 text-left ${tapBrown}`}
                >
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                    <img
                      src={p.image || PLACEHOLDER_IMAGE}
                      alt={p.name}
                      loading="lazy"
                      width={200}
                      height={200}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-2 truncate text-[11px] font-semibold leading-tight group-active:text-primary-foreground">
                    {p.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground group-active:text-primary-foreground/85">
                    {formatPriceRange(p, p.categoryId, categoryVariants)}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-5 py-8 text-center text-xs text-muted-foreground">
                  No products found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cart panel — fixed width on desktop, compact on mobile */}
        <aside className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card lg:w-[200px] xl:w-[220px] max-h-[38vh] lg:max-h-none">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-2.5 py-1.5">
            <h2 className="text-[11px] font-semibold">Order</h2>
            <span className="text-[10px] text-muted-foreground">{cart.length} item{cart.length !== 1 ? "s" : ""}</span>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
            {cart.length === 0 ? (
              <li className="py-3 text-center text-[10px] text-muted-foreground">Tap a product to add</li>
            ) : (
              cart.map((i) => (
                <li key={i.lineId} className="flex items-center gap-1.5 rounded-md bg-muted/30 px-1.5 py-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium leading-tight">{i.name}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <div className="inline-flex items-center rounded border border-border/60 bg-background">
                        <button
                          onClick={() => changeQty(i.lineId, -1)}
                          className="grid h-4 w-4 place-items-center hover:bg-muted"
                          aria-label="Decrease"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="min-w-4 text-center text-[9px] font-medium">{i.qty}</span>
                        <button
                          onClick={() => changeQty(i.lineId, 1)}
                          className="grid h-4 w-4 place-items-center hover:bg-muted"
                          aria-label="Increase"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="text-[10px] font-semibold">₱{(i.price * i.qty).toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(i.lineId)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="shrink-0 border-t border-border px-2.5 py-2 space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
              <input
                type="checkbox"
                checked={seniorDiscount}
                onChange={(e) => setSeniorDiscount(e.target.checked)}
                className="rounded"
              />
              <span className="text-[10px] font-medium leading-tight">
                Senior discount ({seniorDiscountPercent}%)
              </span>
            </label>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {seniorDiscount && (
              <div className="flex justify-between text-[10px] text-emerald-700">
                <span>Discount</span>
                <span>-₱{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold">Total</span>
              <span className="text-sm font-bold">₱{total.toFixed(2)}</span>
            </div>
            <button
              onClick={complete}
              className="h-8 w-full rounded-md bg-primary text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Complete Sale
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="h-6 w-full text-[10px] text-muted-foreground hover:text-foreground"
              >
                Clear cart
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Variant picker — compact */}
      {pickingProduct && pickStep === "variant" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
          onClick={closePicker}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl border border-border bg-card p-3 shadow-2xl sm:rounded-2xl sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Variant · {getCategory(pickingProduct.categoryId)?.name ?? pickingProduct.category}
                </p>
                <h2 className="mt-0.5 text-sm font-semibold truncate">{pickingProduct.name}</h2>
              </div>
              <button onClick={closePicker} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {variantChoices.map((v) => {
                const sized = variantNeedsSize(pickingProduct.categoryId, v.id);
                const price = sized
                  ? Math.min(
                      ...getSizesForVariant(pickingProduct.categoryId, v.id).map((sz) =>
                        getUnitPrice(pickingProduct, { variantId: v.id, size: sz }, categoryVariants),
                      ),
                    )
                  : getUnitPrice(pickingProduct, { variantId: v.id }, categoryVariants);
                return (
                  <button
                    key={v.id}
                    onClick={() => handlePickVariant(v.id)}
                    className={`group flex h-12 flex-col items-center justify-center gap-0 rounded-lg border bg-card ${tapBrown}`}
                  >
                    <span className="text-xs font-semibold">{v.name}</span>
                    <span className="text-[10px] text-muted-foreground group-active:text-primary-foreground/85">
                      {sized ? `from ₱${price.toFixed(2)}` : `₱${price.toFixed(2)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Size picker — COFFEE Hot / Iced */}
      {pickingProduct && pickStep === "size" && pickedVariantId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
          onClick={closePicker}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl border border-border bg-card p-3 shadow-2xl sm:rounded-2xl sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose size
                </p>
                <h2 className="mt-0.5 text-sm font-semibold truncate">{pickingProduct.name}</h2>
              </div>
              <button onClick={closePicker} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={`mt-3 grid gap-1.5 ${sizeChoices.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
              {sizeChoices.map((size) => {
                const price = getUnitPrice(
                  pickingProduct,
                  { variantId: pickedVariantId, size },
                  categoryVariants,
                );
                return (
                  <button
                    key={size}
                    onClick={() => handlePickSize(size)}
                    className={`group flex h-12 flex-col items-center justify-center gap-0 rounded-lg border bg-card ${tapBrown}`}
                  >
                    <span className="text-xs font-semibold">{size}</span>
                    <span className="text-[10px] text-muted-foreground group-active:text-primary-foreground/85">
                      ₱{price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Syrup picker — compact */}
      {pickingProduct && pickStep === "syrup" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
          onClick={closePicker}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl border border-border bg-card p-3 shadow-2xl sm:rounded-2xl sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Syrup (optional)
                </p>
                <h2 className="mt-0.5 text-sm font-semibold truncate">{pickingProduct.name}</h2>
              </div>
              <button onClick={closePicker} className="grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {enabledSyrups.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handlePickSyrup(s.id)}
                  className={`flex h-10 flex-col items-center justify-center rounded-lg border bg-card text-[11px] font-medium ${tapBrown}`}
                >
                  <span>{s.name}</span>
                  {s.price > 0 && (
                    <span className="text-[9px] text-muted-foreground group-active:text-primary-foreground/85">
                      +₱{s.price.toFixed(2)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePickSyrup(undefined)}
              className={`mt-2 h-8 w-full rounded-lg border border-dashed text-[11px] font-medium text-muted-foreground ${tapBrown}`}
            >
              No syrup
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
