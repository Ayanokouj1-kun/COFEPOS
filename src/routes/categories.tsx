import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { activeCategories, variantsForCategory } from "@/lib/categories";
import { Plus, X, Pencil, Trash2, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Category Management — CafePOS" },
      { name: "description", content: "Manage menu categories and their variants." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const {
    menuCategories,
    categoryVariants,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    addVariant,
    updateVariant,
    deleteVariant,
  } = useStore();

  const categories = useMemo(() => activeCategories(menuCategories), [menuCategories]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSyrup, setNewCatSyrup] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSyrup, setEditCatSyrup] = useState(false);
  const [newVariantName, setNewVariantName] = useState<Record<string, string>>({});
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [editVariantName, setEditVariantName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "variant"; id: string; name: string } | null>(null);

  if (!isAdmin) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Only administrators can manage categories.</p>
      </AppLayout>
    );
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await addCategory(newCatName, newCatSyrup);
    setNewCatName("");
    setNewCatSyrup(false);
    setShowAddCat(false);
  };

  const handleSaveCategory = async (id: string) => {
    await updateCategory(id, { name: editCatName, supports_syrup: editCatSyrup });
    setEditingCat(null);
  };

  const handleAddVariant = async (categoryId: string) => {
    const name = newVariantName[categoryId]?.trim();
    if (!name) { toast.error("Enter a variant name."); return; }
    await addVariant(categoryId, name);
    setNewVariantName((prev) => ({ ...prev, [categoryId]: "" }));
  };

  const handleSaveVariant = async (id: string) => {
    await updateVariant(id, { name: editVariantName });
    setEditingVariant(null);
  };

  return (
    <AppLayout
      headerAction={
        <button
          onClick={() => setShowAddCat(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Add Category <Plus className="h-4 w-4" />
        </button>
      }
    >
      <div className="flex items-center gap-3 mb-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Category Management</h1>
          <p className="text-xs text-muted-foreground">
            Manage menu categories and their variants. Coffee categories can support syrup add-ons.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {categories.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No categories yet. Run the SQL migration or add your first category.
          </p>
        )}

        {categories.map((cat) => {
          const variants = variantsForCategory(cat.id, categoryVariants);
          const isOpen = expanded === cat.id;
          const isEditing = editingCat === cat.id;

          return (
            <div key={cat.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : cat.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-muted transition"
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="h-8 flex-1 min-w-[140px] rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={editCatSyrup}
                        onChange={(e) => setEditCatSyrup(e.target.checked)}
                        className="rounded"
                      />
                      Syrup option
                    </label>
                    <button
                      onClick={() => handleSaveCategory(cat.id)}
                      className="h-8 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingCat(null)} className="h-8 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {variants.length} variant{variants.length !== 1 ? "s" : ""}
                        {cat.supports_syrup && " · Syrup add-on enabled"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingCat(cat.id);
                          setEditCatName(cat.name);
                          setEditCatSyrup(cat.supports_syrup);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"
                        aria-label="Edit category"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                        className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10 transition"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-border bg-muted/20 px-4 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Variants
                  </p>
                  {variants.length === 0 ? (
                    <p className="mb-3 text-xs text-muted-foreground">No variants — products use a single price.</p>
                  ) : (
                    <ul className="mb-3 space-y-1.5">
                      {variants.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                          {editingVariant === v.id ? (
                            <>
                              <input
                                value={editVariantName}
                                onChange={(e) => setEditVariantName(e.target.value)}
                                className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs outline-none"
                              />
                              <button onClick={() => handleSaveVariant(v.id)} className="text-xs font-medium text-primary">Save</button>
                              <button onClick={() => setEditingVariant(null)} className="text-xs text-muted-foreground">Cancel</button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-xs font-medium">{v.name}</span>
                              <button
                                onClick={() => { setEditingVariant(v.id); setEditVariantName(v.name); }}
                                className="grid h-6 w-6 place-items-center rounded hover:bg-muted"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ type: "variant", id: v.id, name: v.name })}
                                className="grid h-6 w-6 place-items-center rounded text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      value={newVariantName[cat.id] ?? ""}
                      onChange={(e) => setNewVariantName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="New variant name — e.g. Iced"
                      className="h-8 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/30"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddVariant(cat.id); } }}
                    />
                    <button
                      onClick={() => handleAddVariant(cat.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAddCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px]" onClick={() => setShowAddCat(false)}>
          <form
            onSubmit={handleAddCategory}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">New Category</h2>
              <button type="button" onClick={() => setShowAddCat(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <label className="block mb-3">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Category name</span>
              <input
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. COFFEE"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <label className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <input type="checkbox" checked={newCatSyrup} onChange={(e) => setNewCatSyrup(e.target.checked)} className="rounded" />
              Enable syrup flavor add-on (for coffee drinks)
            </label>
            <button type="submit" className="h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Create Category
            </button>
          </form>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          if (deleteTarget.type === "category") await deleteCategory(deleteTarget.id);
          else await deleteVariant(deleteTarget.id);
          setDeleteTarget(null);
        }}
        title={deleteTarget?.type === "category" ? "Delete Category" : "Delete Variant"}
        description={
          deleteTarget?.type === "category"
            ? "This will soft-delete the category. Products assigned to it may need reassignment."
            : "This will remove the variant. Products using it will keep their other variant prices."
        }
        itemName={deleteTarget?.name}
      />
    </AppLayout>
  );
}
