import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X, UploadCloud, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import {
  activeCategories,
  categoryHasVariants,
  defaultSizePricesForVariant,
  defaultVariantPrices,
  formatPriceRange,
  getUnitPrice,
  getSizesForVariant,
  variantNeedsSize,
  variantsForCategory,
} from "@/lib/categories";
import { PLACEHOLDER_IMAGE } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & Costing — CafePOS" },
      { name: "description", content: "Manage café menu items, prices, and cost margins." },
      { property: "og:title", content: "Products & Costing — CafePOS" },
      { property: "og:description", content: "Manage café menu items, prices, and cost margins." },
    ],
  }),
  component: Products,
});

function Products() {
  const { products, menuCategories, categoryVariants, addProduct, deleteProduct, updateProduct, isAdmin } =
    useStore();
  const categories = useMemo(() => activeCategories(menuCategories), [menuCategories]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    cost: "",
    categoryId: "",
    image: "",
    variantPrices: {} as Record<string, string>,
    sizePrices: {} as Record<string, Record<string, string>>,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const defaultCategoryId = categories[0]?.id ?? "";

  const buildEmptyPrices = (catId: string, base = "0") => {
    const variants = variantsForCategory(catId, categoryVariants);
    const variantPrices: Record<string, string> = {};
    const sizePrices: Record<string, Record<string, string>> = {};
    const n = Number(base) || 0;
    for (const v of variants) {
      if (variantNeedsSize(catId, v.id)) {
        const defaults = defaultSizePricesForVariant(n, v.id);
        sizePrices[v.id] = Object.fromEntries(
          Object.entries(defaults).map(([k, val]) => [k, String(val)]),
        );
      } else {
        variantPrices[v.id] = base;
      }
    }
    return { variantPrices, sizePrices };
  };

  const emptyForm = () => {
    const catId = defaultCategoryId;
    const { variantPrices, sizePrices } = buildEmptyPrices(catId);
    return {
      name: "",
      price: "",
      cost: "",
      categoryId: catId,
      image: "",
      variantPrices,
      sizePrices,
    };
  };

  const formVariants = useMemo(
    () => variantsForCategory(form.categoryId, categoryVariants),
    [form.categoryId, categoryVariants],
  );

  const startEdit = (p: (typeof products)[0]) => {
    setEditingId(p.id);
    const variants = variantsForCategory(p.categoryId, categoryVariants);
    const vPrices = p.variantPrices || defaultVariantPrices(p.price, p.categoryId, categoryVariants);
    const variantPrices: Record<string, string> = {};
    const sizePrices: Record<string, Record<string, string>> = {};
    for (const v of variants) {
      if (variantNeedsSize(p.categoryId, v.id)) {
        const defaults = p.sizePrices?.[v.id] || defaultSizePricesForVariant(p.price, v.id);
        sizePrices[v.id] = Object.fromEntries(
          getSizesForVariant(p.categoryId, v.id).map((sz) => [sz, String(defaults[sz] ?? "")]),
        );
      } else {
        variantPrices[v.id] = String(vPrices[v.id] ?? "");
      }
    }
    setForm({
      name: p.name,
      price: p.price.toString(),
      cost: p.cost.toString(),
      categoryId: p.categoryId,
      image: p.image || "",
      variantPrices,
      sizePrices,
    });
    setOpen(true);
  };

  const close = () => {
    setForm(emptyForm());
    setEditingId(null);
    setOpen(false);
  };

  const applyBasePriceToVariants = (base: string, categoryId: string) => {
    return buildEmptyPrices(categoryId, base);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image file size should be less than 5MB."); return; }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, image: urlData.publicUrl }));
      toast.success("Image uploaded successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Storage upload error:", err);
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) { toast.error("Please wait for the image upload to complete."); return; }
    const cost = Number(form.cost);
    if (!form.name.trim() || Number.isNaN(cost)) { toast.error("Enter a name and cost."); return; }
    if (!form.categoryId) { toast.error("Select a category."); return; }

    let price = Number(form.price);
    let variantPrices: Record<string, number> | undefined;
    let sizePrices: Record<string, Record<string, number>> | undefined;

    if (categoryHasVariants(form.categoryId, categoryVariants)) {
      const variants = variantsForCategory(form.categoryId, categoryVariants);
      variantPrices = {};
      sizePrices = {};
      for (const v of variants) {
        if (variantNeedsSize(form.categoryId, v.id)) {
          sizePrices[v.id] = {};
          for (const sz of getSizesForVariant(form.categoryId, v.id)) {
            const n = Number(form.sizePrices[v.id]?.[sz]);
            if (Number.isNaN(n) || n < 0) {
              toast.error(`Enter a valid ${v.name} price for ${sz}.`);
              return;
            }
            sizePrices[v.id]![sz] = n;
          }
          if (v.id === "coffee-hot" && sizePrices[v.id]!["12oz"] != null) {
            price = sizePrices[v.id]!["12oz"]!;
          }
        } else {
          const n = Number(form.variantPrices[v.id]);
          if (Number.isNaN(n) || n < 0) {
            toast.error(`Enter a valid price for ${v.name}.`);
            return;
          }
          variantPrices[v.id] = n;
        }
      }
      if (Object.keys(variantPrices).length === 0) variantPrices = undefined;
      if (Object.keys(sizePrices).length === 0) sizePrices = undefined;
    } else if (Number.isNaN(price)) {
      toast.error("Enter a name, price, and cost.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      price,
      cost,
      categoryId: form.categoryId,
      image: form.image,
      variantPrices,
      sizePrices,
    };

    if (editingId) {
      updateProduct(editingId, payload);
      toast.success(`${form.name.trim()} updated`);
    } else {
      addProduct(payload);
      toast.success(`${form.name.trim()} added to menu`);
    }
    close();
  };

  const addBtn = isAdmin ? (
    <button
      onClick={() => { setEditingId(null); setForm(emptyForm()); setOpen(true); }}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Product <Plus className="h-4 w-4" />
    </button>
  ) : undefined;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        )
      : products;
  }, [products, searchQuery]);

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-xl font-semibold tracking-tight">Products &amp; Costing</h1>

      <div className="relative mt-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name or category..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredProducts.map((p) => {
          const listPrice = categoryHasVariants(p.categoryId, categoryVariants)
            ? getUnitPrice(p, {}, categoryVariants)
            : p.price;
          const profit = listPrice - p.cost;
          return (
            <div
              key={p.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col gap-3">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                  <img
                    src={p.image || PLACEHOLDER_IMAGE}
                    alt={p.name}
                    loading="lazy"
                    width={512}
                    height={512}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-xs font-semibold flex-1">{p.name}</h3>
                    <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/80 px-2 py-0.5 text-[9px] font-medium text-secondary-foreground">
                      {p.category}
                    </span>
                  </div>
                  <dl className="mt-1.5 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-medium">{formatPriceRange(p, p.categoryId, categoryVariants)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Cost</dt>
                      <dd className="font-medium">₱{p.cost.toFixed(2)}</dd>
                    </div>
                    <div className="mt-1 flex justify-between border-t border-border/40 pt-1">
                      <dt className="font-medium">Profit</dt>
                      <dd className="font-semibold text-emerald-700">₱{profit.toFixed(2)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-1.5 flex justify-end gap-1.5 border-t border-border/40 pt-2">
                  <button onClick={() => startEdit(p)} className="h-7 flex-1 cursor-pointer rounded bg-secondary px-2 text-[10px] font-medium text-secondary-foreground transition hover:bg-secondary/80 active:scale-95">
                    Edit
                  </button>
                  <button
                    onClick={() => { setProductToDelete({ id: p.id, name: p.name }); setDeleteConfirmOpen(true); }}
                    className="h-7 cursor-pointer rounded bg-destructive/10 px-2 text-[10px] font-medium text-destructive transition hover:bg-destructive/20 active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]" onClick={close}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">{editingId ? "Edit product" : "Add product"}</h2>
                <p className="text-[11px] text-muted-foreground">{editingId ? "Update menu item details" : "Create a new menu item"}</p>
              </div>
              <button type="button" onClick={close} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-4 py-3.5">
              <div className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {form.image ? (
                    <img src={form.image} alt="Preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }} />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground"><UploadCloud className="h-4 w-4" /></div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="h-4 w-4 animate-spin text-white" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Product name — e.g. Caramel Latte"
                    className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="flex gap-1.5">
                    <label className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-secondary px-2 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80 transition">
                      <UploadCloud className="h-3 w-3" />
                      {form.image ? "Change" : "Photo"}
                      <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" disabled={uploading} />
                    </label>
                    {form.image && (
                      <button type="button" onClick={() => setForm((prev) => ({ ...prev, image: "" }))} disabled={uploading} className="h-7 rounded-lg px-2 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Category</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => {
                    const categoryId = e.target.value;
                    setForm((prev) => {
                      const prices = categoryHasVariants(categoryId, categoryVariants)
                        ? applyBasePriceToVariants(prev.price || "0", categoryId)
                        : { variantPrices: {}, sizePrices: {} };
                      return { ...prev, categoryId, ...prices };
                    });
                  }}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {categoryHasVariants(c.id, categoryVariants)
                        ? ` · ${variantsForCategory(c.id, categoryVariants).map((v) => v.name).join(", ")}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              {categoryHasVariants(form.categoryId, categoryVariants) ? (
                <div className="space-y-3">
                  <span className="block text-[11px] font-medium text-muted-foreground">Pricing (₱)</span>
                  {formVariants.map((v) =>
                    variantNeedsSize(form.categoryId, v.id) ? (
                      <div key={v.id}>
                        <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
                          {v.name} — size prices
                        </p>
                        <div
                          className={`grid gap-1.5 ${
                            getSizesForVariant(form.categoryId, v.id).length === 3
                              ? "grid-cols-3"
                              : "grid-cols-2"
                          }`}
                        >
                          {getSizesForVariant(form.categoryId, v.id).map((size) => (
                            <label
                              key={size}
                              className="rounded-xl border border-border bg-muted/25 px-2 py-1.5"
                            >
                              <span className="block text-[10px] font-semibold text-muted-foreground">
                                {size}
                              </span>
                              <input
                                required
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.sizePrices[v.id]?.[size] ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm((prev) => ({
                                    ...prev,
                                    sizePrices: {
                                      ...prev.sizePrices,
                                      [v.id]: { ...prev.sizePrices[v.id], [size]: val },
                                    },
                                    price: size === "12oz" && v.id === "coffee-hot" ? val : prev.price,
                                  }));
                                }}
                                placeholder="0.00"
                                className="mt-0.5 h-7 w-full bg-transparent text-xs font-medium outline-none"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label key={v.id} className="block rounded-xl border border-border bg-muted/25 px-2 py-1.5">
                        <span className="block text-[10px] font-semibold text-muted-foreground">
                          {v.name}
                        </span>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.variantPrices[v.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              variantPrices: { ...prev.variantPrices, [v.id]: val },
                            }));
                          }}
                          placeholder="0.00"
                          className="mt-0.5 h-7 w-full bg-transparent text-xs font-medium outline-none"
                        />
                      </label>
                    ),
                  )}
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Price (₱)</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 85.00"
                    className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/30"
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Cost (₱)</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="e.g. 35.00"
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/30"
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/20 px-4 py-3">
              <button type="button" onClick={close} className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition">Cancel</button>
              <button type="submit" disabled={uploading} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50">
                {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingId ? "Save changes" : "Add to menu"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setProductToDelete(null); }}
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct(productToDelete.id);
            toast.success(`${productToDelete.name} deleted`);
          }
        }}
        title="Delete Menu Product"
        description="Are you sure you want to delete this product? It will be soft-deleted and hidden from the menus."
        itemName={productToDelete?.name}
      />
    </AppLayout>
  );
}
