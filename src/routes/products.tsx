import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X, UploadCloud, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import {
  categoryNeedsSize,
  defaultSizePrices,
  formatPriceRange,
  getAutomaticCategory,
  getPriceForSize,
  getProductCategory,
  getSizesForCategory,
  type Category,
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
  const { products, addProduct, deleteProduct, updateProduct, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: "",
    cost: "",
    category: "Hot" as Category,
    image: "",
    sizePrices: {} as Record<string, string>,
  });
  const [isCategoryManual, setIsCategoryManual] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const emptyForm = () => ({
    name: "",
    price: "",
    cost: "",
    category: "Hot" as Category,
    image: "",
    sizePrices: Object.fromEntries(
      getSizesForCategory("Hot").map((s) => [s, ""]),
    ) as Record<string, string>,
  });

  const startEdit = (p: (typeof products)[0]) => {
    setEditingId(p.id);
    const category = getProductCategory(p.category, p.name);
    const sizePrices = p.sizePrices || defaultSizePrices(p.price, category);
    setForm({
      name: p.name,
      price: p.price.toString(),
      cost: p.cost.toString(),
      category,
      image: p.image || "",
      sizePrices: Object.fromEntries(
        getSizesForCategory(category).map((s) => [s, String(sizePrices[s] ?? "")]),
      ),
    });
    setIsCategoryManual(true);
    setOpen(true);
  };

  const close = () => {
    setForm(emptyForm());
    setIsCategoryManual(false);
    setEditingId(null);
    setOpen(false);
  };

  const applyBasePriceToSizes = (base: string, category: Category) => {
    const n = Number(base);
    if (Number.isNaN(n) || !categoryNeedsSize(category)) return {};
    const defaults = defaultSizePrices(n, category);
    return Object.fromEntries(
      Object.entries(defaults).map(([k, v]) => [k, String(v)]),
    ) as Record<string, string>;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB.");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, image: urlData.publicUrl }));
      toast.success("Image uploaded successfully!");
    } catch (err: any) {
      console.error("Storage upload error:", err);
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      toast.error("Please wait for the image upload to complete.");
      return;
    }
    const cost = Number(form.cost);
    if (!form.name.trim() || Number.isNaN(cost)) {
      toast.error("Enter a name and cost.");
      return;
    }

    let price = Number(form.price);
    let sizePrices: Record<string, number> | undefined;

    if (categoryNeedsSize(form.category)) {
      const sizes = getSizesForCategory(form.category);
      sizePrices = {};
      for (const size of sizes) {
        const n = Number(form.sizePrices[size]);
        if (Number.isNaN(n) || n < 0) {
          toast.error(`Enter a valid price for ${size}.`);
          return;
        }
        sizePrices[size] = n;
      }
      // Listing / base price = 12oz when present, else first size
      price = sizePrices["12oz"] ?? sizePrices[sizes[0]!] ?? price;
      if (Number.isNaN(price)) {
        toast.error("Enter size prices.");
        return;
      }
    } else if (Number.isNaN(price)) {
      toast.error("Enter a name, price, and cost.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      price,
      cost,
      category: form.category,
      image: form.image,
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
      onClick={() => {
        setEditingId(null);
        setIsCategoryManual(false);
        setForm(emptyForm());
        setOpen(true);
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Product <Plus className="h-4 w-4" />
    </button>
  ) : undefined;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          const category = getProductCategory(p.category, p.name);
          const listPrice = categoryNeedsSize(category)
            ? getPriceForSize({ ...p, category }, "12oz")
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
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-xs font-semibold flex-1">{p.name}</h3>
                    <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/80 px-2 py-0.5 text-[9px] font-medium text-secondary-foreground">
                      {category}
                    </span>
                  </div>
                  <dl className="mt-1.5 space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-medium">{formatPriceRange({ ...p, category })}</dd>
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
                  <button
                    onClick={() => startEdit(p)}
                    className="h-7 flex-1 cursor-pointer rounded bg-secondary px-2 text-[10px] font-medium text-secondary-foreground transition hover:bg-secondary/80 active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setProductToDelete({ id: p.id, name: p.name });
                      setDeleteConfirmOpen(true);
                    }}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]"
          onClick={close}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {editingId ? "Edit product" : "Add product"}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {editingId ? "Update menu item details" : "Create a new menu item"}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto px-4 py-3.5">
              {/* Compact image + name */}
              <div className="flex gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted-foreground">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-black/50">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <label className="block">
                    <span className="sr-only">Name</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          name: val,
                          category: isCategoryManual ? prev.category : getAutomaticCategory(val),
                        }));
                      }}
                      placeholder="Product name — e.g. Matcha Latte"
                      className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring/30"
                    />
                  </label>
                  <div className="flex gap-1.5">
                    <label className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg bg-secondary px-2 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80 transition">
                      <UploadCloud className="h-3 w-3" />
                      {form.image ? "Change" : "Photo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                        disabled={uploading}
                      />
                    </label>
                    {form.image && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                        className="h-7 rounded-lg px-2 text-[10px] font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Category
                </span>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const category = e.target.value as Category;
                    setIsCategoryManual(true);
                    setForm((prev) => ({
                      ...prev,
                      category,
                      sizePrices: categoryNeedsSize(category)
                        ? applyBasePriceToSizes(
                            prev.price || prev.sizePrices["12oz"] || "0",
                            category,
                          )
                        : {},
                    }));
                  }}
                  className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/30"
                >
                  <option value="Hot">Hot · 8 / 12 / 16 oz</option>
                  <option value="Cold">Cold · 12 / 16 oz</option>
                  <option value="Waffles">Waffles</option>
                  <option value="Flavors">Flavors (syrup)</option>
                </select>
              </label>

              {categoryNeedsSize(form.category) ? (
                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Size prices (₱)
                  </span>
                  <div
                    className={`grid gap-1.5 ${
                      form.category === "Hot" ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    {getSizesForCategory(form.category).map((size) => (
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
                          value={form.sizePrices[size] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              sizePrices: { ...prev.sizePrices, [size]: val },
                              price: size === "12oz" ? val : prev.price,
                            }));
                          }}
                          placeholder={
                            size === "8oz" ? "70.00" : size === "12oz" ? "80.00" : "100.00"
                          }
                          className="mt-0.5 h-7 w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Price (₱)
                  </span>
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
                <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                  Cost (₱)
                </span>
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
              <button
                type="button"
                onClick={close}
                className="h-8 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
              >
                {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
                {editingId ? "Save changes" : "Add to menu"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setProductToDelete(null);
        }}
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
