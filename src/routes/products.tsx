import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X, UploadCloud, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { CATEGORIES, getAutomaticCategory, type Category } from "@/lib/categories";
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
    category: "Coffee" as Category,
    image: "",
  });
  const [isCategoryManual, setIsCategoryManual] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (p: (typeof products)[0]) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price.toString(),
      cost: p.cost.toString(),
      category: (p.category as Category) || getAutomaticCategory(p.name),
      image: p.image || "",
    });
    setIsCategoryManual(true);
    setOpen(true);
  };

  const close = () => {
    setForm({ name: "", price: "", cost: "", category: "Coffee" as Category, image: "" });
    setIsCategoryManual(false);
    setEditingId(null);
    setOpen(false);
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
    const price = Number(form.price);
    const cost = Number(form.cost);
    if (!form.name.trim() || Number.isNaN(price) || Number.isNaN(cost)) {
      toast.error("Enter a name, price, and cost.");
      return;
    }
    if (editingId) {
      updateProduct(editingId, {
        name: form.name.trim(),
        price,
        cost,
        category: form.category,
        image: form.image,
      });
      toast.success(`${form.name.trim()} updated`);
    } else {
      addProduct({
        name: form.name.trim(),
        price,
        cost,
        category: form.category,
        image: form.image,
      });
      toast.success(`${form.name.trim()} added to menu`);
    }
    close();
  };

  const addBtn = isAdmin ? (
    <button
      onClick={() => setOpen(true)}
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
          const profit = p.price - p.cost;
          const category = (p.category as Category) || getAutomaticCategory(p.name);
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
                      <dd className="font-medium">₱{p.price.toFixed(2)}</dd>
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
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={close}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Product" : "Add Product"}
              </h2>
              <button
                type="button"
                onClick={close}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Name</span>
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
                  placeholder="e.g. Cappuccino"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Category</span>
                <select
                  value={form.category}
                  onChange={(e) => {
                    setIsCategoryManual(true);
                    setForm((prev) => ({ ...prev, category: e.target.value as Category }));
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <div className="block text-sm">
                <span className="text-muted-foreground">Product Picture</span>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="Product preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    ) : (
                      <span className="text-2xl text-muted-foreground">☕</span>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-secondary px-3.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition active:scale-95">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{form.image ? "Change Picture" : "Upload Picture"}</span>
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
                        className="inline-flex h-7 items-center justify-center rounded bg-destructive/10 px-2.5 text-[11px] font-medium text-destructive hover:bg-destructive/20 transition active:scale-95 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Price (₱)</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Cost (₱)</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
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
                onClick={close}
                className="h-9 rounded-md border border-border px-4 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
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
