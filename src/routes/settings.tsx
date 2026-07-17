import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { useStore } from "@/lib/store";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "POS Settings — CafePOS" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { seniorDiscountPercent, updateSeniorDiscountPercent, isAdmin } = useStore();
  const [pct, setPct] = useState(String(seniorDiscountPercent));

  useEffect(() => {
    setPct(String(seniorDiscountPercent));
  }, [seniorDiscountPercent]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Only administrators can change POS settings.</p>
      </AppLayout>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSeniorDiscountPercent(Number(pct));
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15">
          <Settings className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">POS Settings</h1>
          <p className="text-xs text-muted-foreground">Configure discounts and checkout options.</p>
        </div>
      </div>

      <form onSubmit={save} className="max-w-sm rounded-xl border border-border bg-card p-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senior citizen discount (%)</span>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Applied at checkout when staff enables the senior discount toggle on New Sale.
          </p>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Save settings
        </button>
      </form>
    </AppLayout>
  );
}
