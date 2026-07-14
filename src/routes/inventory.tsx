import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Coffee, Milk, GlassWater, Droplet, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — CafePOS" },
      { name: "description", content: "Track café stock levels and add new inventory." },
      { property: "og:title", content: "Inventory — CafePOS" },
      { property: "og:description", content: "Track café stock levels and add new inventory." },
    ],
  }),
  component: Inventory,
});

const iconFor: Record<string, typeof Coffee> = {
  "Coffee Beans": Coffee,
  "Fresh Milk": Milk,
  "16 oz Cups": GlassWater,
  "Bottled Water": Droplet,
};

function Inventory() {
  const { inventory, addStock, deleteStock, isAdmin } = useStore();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: "", available: "", status: "in" as "in" | "low" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const startEdit = (item: (typeof inventory)[0]) => {
    setIsEditing(true);
    setForm({ name: item.name, available: item.available, status: item.status });
    setOpen(true);
  };

  const close = () => {
    setForm({ name: "", available: "", status: "in" });
    setIsEditing(false);
    setOpen(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.available.trim()) {
      toast.error("Enter an item name and quantity.");
      return;
    }
    addStock({ name: form.name.trim(), available: form.available.trim(), status: form.status });
    toast.success(isEditing ? `${form.name} updated` : `${form.name} stock updated`);
    close();
  };

  const addBtn = isAdmin ? (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Stock <Plus className="h-4 w-4" />
    </button>
  ) : undefined;

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card p-4">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="pb-2 text-xs font-medium">Item</th>
              <th className="pb-2 text-xs font-medium">Available</th>
              <th className="pb-2 text-xs font-medium">Status</th>
              {isAdmin && <th className="pb-2 text-right text-xs font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {inventory.map((r) => {
              const Icon = iconFor[r.name] ?? Coffee;
              return (
                <tr
                  key={r.name}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/10"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-foreground/60">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-xs">{r.name}</span>
                    </div>
                  </td>
                  <td
                    className={`py-2 text-xs font-medium ${r.status === "low" ? "text-orange-600" : ""}`}
                  >
                    {r.available}
                  </td>
                  <td className="py-2 text-left">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        r.status === "low"
                          ? "bg-warning text-warning-foreground"
                          : "bg-success text-success-foreground"
                      }`}
                    >
                      {r.status === "low" ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(r)}
                          className="h-6 rounded bg-secondary px-2 text-[10px] font-medium text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition active:scale-95"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setItemToDelete(r.name);
                            setDeleteConfirmOpen(true);
                          }}
                          className="h-6 rounded bg-destructive/10 px-2 text-[10px] font-medium text-destructive hover:bg-destructive/20 cursor-pointer transition active:scale-95"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onClick={close}>
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{isEditing ? "Edit Stock" : "Add Stock"}</h2>
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
                <span className="text-muted-foreground">Item name</span>
                <input
                  required
                  disabled={isEditing}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Fresh Milk"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-60"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Available</span>
                <input
                  required
                  value={form.available}
                  onChange={(e) => setForm({ ...form, available: e.target.value })}
                  placeholder="e.g. 5 L or 24 pcs"
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as "in" | "low" })}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="in">In Stock</option>
                  <option value="low">Low Stock</option>
                </select>
              </label>
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
          setItemToDelete(null);
        }}
        onConfirm={() => {
          if (itemToDelete) {
            deleteStock(itemToDelete);
            toast.success(`${itemToDelete} deleted`);
          }
        }}
        title="Delete Stock Item"
        description="Are you sure you want to delete this item from inventory? It will be soft-deleted and hidden."
        itemName={itemToDelete ?? undefined}
      />
    </AppLayout>
  );
}
