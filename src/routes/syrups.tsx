import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { activeSyrups } from "@/lib/categories";
import { Plus, X, Pencil, Trash2, Droplet } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

export const Route = createFileRoute("/syrups")({
  head: () => ({
    meta: [
      { title: "Syrup Dashboard — CafePOS" },
      { name: "description", content: "Manage syrup flavors for coffee drinks." },
    ],
  }),
  component: SyrupsPage,
});

function SyrupsPage() {
  const { syrups, isAdmin, addSyrup, updateSyrup, deleteSyrup } = useStore();
  const list = useMemo(() => activeSyrups(syrups), [syrups]);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("0");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (!isAdmin) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Only administrators can manage syrups.</p>
      </AppLayout>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addSyrup(newName, Number(newPrice) || 0);
    setNewName("");
    setNewPrice("0");
    setShowAdd(false);
  };

  const handleSave = async (id: string) => {
    await updateSyrup(id, { name: editName, price: Number(editPrice) || 0 });
    setEditingId(null);
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await updateSyrup(id, { enabled: !enabled });
  };

  return (
    <AppLayout
      headerAction={
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Add Syrup <Plus className="h-4 w-4" />
        </button>
      }
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
          <Droplet className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Syrup Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Manage syrup flavors. Enabled syrups appear as add-ons for Coffee drinks at checkout.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
              <th className="px-4 py-2.5 text-xs font-medium">Flavor</th>
              <th className="px-4 py-2.5 text-xs font-medium">Price</th>
              <th className="px-4 py-2.5 text-xs font-medium">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  {editingId === s.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 w-full max-w-xs rounded-lg border border-border bg-background px-2.5 text-xs outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(s.id); }}
                    />
                  ) : (
                    <span className="text-sm font-medium">{s.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === s.id ? (
                    <input
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 w-20 rounded-lg border border-border bg-background px-2.5 text-xs outline-none"
                    />
                  ) : (
                    <span className="text-sm tabular-nums">₱{s.price.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleEnabled(s.id, s.enabled)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                      s.enabled
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    {editingId === s.id ? (
                      <>
                        <button onClick={() => handleSave(s.id)} className="h-7 rounded px-2 text-xs font-medium text-primary hover:bg-primary/10">Save</button>
                        <button onClick={() => setEditingId(null)} className="h-7 rounded px-2 text-xs text-muted-foreground hover:bg-muted">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(s.id);
                            setEditName(s.name);
                            setEditPrice(String(s.price));
                          }}
                          className="grid h-7 w-7 place-items-center rounded hover:bg-muted"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                          className="grid h-7 w-7 place-items-center rounded text-destructive hover:bg-destructive/10"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">
                  No syrups yet. Add your first flavor above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]" onClick={() => setShowAdd(false)}>
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">New Syrup Flavor</h2>
              <button type="button" onClick={() => setShowAdd(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="block mb-3">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Flavor name</span>
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Vanilla, Caramel, Hazelnut"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="block mb-4">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Add-on price (₱)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <button type="submit" className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Add Syrup
            </button>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await deleteSyrup(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title="Delete Syrup"
        description="This syrup will be removed and will no longer appear as a coffee add-on."
        itemName={deleteTarget?.name}
      />
    </AppLayout>
  );
}
