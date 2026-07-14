import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Plus, X, UploadCloud, Loader2, Search, Minus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { supabase } from "@/lib/supabase";
import { PLACEHOLDER_IMAGE } from "@/lib/data";

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

const adjustQuantity = (current: string, delta: number): string => {
  const match = current.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) {
    const parsed = parseFloat(current);
    if (isNaN(parsed)) return current;
    const nextVal = Math.max(0, parsed + delta);
    return `${nextVal}`;
  }
  const num = parseFloat(match[1]);
  const suffix = match[2];
  const nextVal = Math.max(0, num + delta);
  return suffix ? `${nextVal} ${suffix}` : `${nextVal}`;
};

function Inventory() {
  const { inventory, addStock, deleteStock, isAdmin, role } = useStore();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    available: "",
    status: "in" as "in" | "low",
    image: "",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = (item: (typeof inventory)[0]) => {
    setIsEditing(true);
    setForm({ name: item.name, available: item.available, status: item.status, image: item.image || "" });
    setOpen(true);
  };

  const close = () => {
    setForm({ name: "", available: "", status: "in", image: "" });
    setIsEditing(false);
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

    try {
      const { error: uploadError } = await supabase.storage
        .from("inventory-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(fileName);

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
    if (!form.name.trim() || !form.available.trim()) {
      toast.error("Enter an item name and quantity.");
      return;
    }
    addStock({
      name: form.name.trim(),
      available: form.available.trim(),
      status: form.status,
      image: form.image,
    });
    toast.success(isEditing ? `${form.name} updated` : `${form.name} stock updated`);
    close();
  };

  const handleAdjustStock = (item: (typeof inventory)[0], delta: number) => {
    const nextAvailable = adjustQuantity(item.available, delta);
    if (nextAvailable === item.available) return;

    const parsed = parseFloat(nextAvailable);
    const status = (!isNaN(parsed) && parsed <= 2) ? "low" : "in";

    addStock({
      name: item.name,
      available: nextAvailable,
      status: status,
      image: item.image,
    });
    toast.success(`Updated ${item.name} stock to ${nextAvailable}`);
  };

  const addBtn = isAdmin ? (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      Add Stock <Plus className="h-4 w-4" />
    </button>
  ) : undefined;

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout headerAction={addBtn}>
      <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>

      <div className="relative mt-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search stock items..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition"
        />
      </div>

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
            {filteredInventory.map((r) => (
              <tr
                key={r.name}
                className="border-b border-border/60 last:border-0 hover:bg-muted/10"
              >
                <td className="py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = PLACEHOLDER_IMAGE;
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">📦</span>
                      )}
                    </div>
                    <span className="font-medium text-xs">{r.name}</span>
                  </div>
                </td>
                <td className="py-2 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    {(isAdmin || role === "barista") && (
                      <button
                        onClick={() => handleAdjustStock(r, -1)}
                        className="h-6 w-6 flex items-center justify-center rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition active:scale-95"
                        aria-label="Decrease stock"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                    <span className={r.status === "low" ? "text-orange-600" : ""}>
                      {r.available}
                    </span>
                    {(isAdmin || role === "barista") && (
                      <button
                        onClick={() => handleAdjustStock(r, 1)}
                        className="h-6 w-6 flex items-center justify-center rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition active:scale-95"
                        aria-label="Increase stock"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
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
            ))}
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

              <div className="block text-sm">
                <span className="text-muted-foreground">Item Picture</span>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="Item preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = PLACEHOLDER_IMAGE;
                        }}
                      />
                    ) : (
                      <span className="text-2xl text-muted-foreground">📦</span>
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
