import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  itemName?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  description = "This action cannot be undone. Please type CONFIRM to proceed.",
  itemName,
}: ConfirmDeleteModalProps) {
  const [inputValue, setInputValue] = useState("");

  // Clear input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.toUpperCase() === "CONFIRM") {
      onConfirm();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in scale-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {itemName && (
              <p className="mt-1 text-sm font-medium text-foreground">
                Item:{" "}
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{itemName}</span>
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="confirm-input"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Type <span className="font-bold text-destructive">CONFIRM</span> to enable deletion:
            </label>
            <input
              id="confirm-input"
              type="text"
              required
              autoFocus
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold tracking-wider outline-none focus:ring-2 focus:ring-destructive/40 transition placeholder:font-normal placeholder:tracking-normal text-center uppercase"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-border px-4 text-xs font-medium hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inputValue.toUpperCase() !== "CONFIRM"}
              className="h-9 rounded-lg bg-destructive px-5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
            >
              Delete Permanently
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
