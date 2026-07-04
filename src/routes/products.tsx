import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { CATEGORIES, getAutomaticCategory, type Category } from "@/lib/categories";
import { PLACEHOLDER_IMAGE } from "@/lib/data";

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
  const { products, addProduct, deleteProduct, updateProduct, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    cost: "",
    category: "Coffee" as Category,
  });
  const [isCategoryManual, setIsCategoryManual] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  const startEdit = (p: (typeof products)[0]) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: p.price.toString(),
      cost: p.cost.toString(),
      category: (p.category as Category) || getAutomaticCategory(p.name),
    });
    setIsCategoryManual(true);
    setOpen(true);
  };

  const close = () => {
    setForm({ name: "", price: "", cost: "", category: "Coffee" as Category });
    setIsCategoryManual(false);
    setEditingId(null);
    setOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    const cost = Number(form.cost);
    if (!form.name.trim() || Number.isNaN(price) || Number.isNaN(cost)) {
      toast.error("Enter a name, price, and cost.");
      return;
    }
    if (editingId) {
      updateProduct(editingId, { name: form.name.trim(), price, cost, category: form.category });
      toast.success(`${form.name.trim()} updated`);
    } else {
      addProduct({ name: form.name.trim(), price, cost, category: form.category });
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

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-xl font-semibold tracking-tight">Products &amp; Costing</h1>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => {
          const profit = p.price - p.cost;
          const category = (p.category as Category) || getAutomaticCategory(p.name);
          return (
            <div
              key={p.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex gap-4">
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-base font-semibold">{p.name}</h3>
                    <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                      {category}
                    </span>
                  </div>
                  <dl className="mt-1.5 space-y-0.5 text-xs">
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
                <div className="mt-2 flex justify-end gap-2 border-t border-border/40 pt-2">
                  <button
                    onClick={() => startEdit(p)}
                    className="h-7 cursor-pointer rounded bg-secondary px-2.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/80 active:scale-95"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setProductToDelete({ id: p.id, name: p.name });
                      setDeleteConfirmOpen(true);
                    }}
                    className="h-7 cursor-pointer rounded bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition hover:bg-destructive/20 active:scale-95"
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
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
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
