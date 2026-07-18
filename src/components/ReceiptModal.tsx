import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Transaction } from "@/lib/store";
import { printReceipt, downloadReceiptPdf } from "@/lib/receipt";
import { useStore } from "@/lib/store";
import { Printer, Download, CheckCircle } from "lucide-react";

interface ReceiptModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ transaction, isOpen, onClose }: ReceiptModalProps) {
  const { displayName } = useStore();
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!transaction) return null;

  const handlePrint = () => {
    setPrinting(true);
    printReceipt(transaction, { cashier: displayName });
    setTimeout(() => setPrinting(false), 1000);
  };

  const handleDownload = () => {
    setDownloading(true);
    downloadReceiptPdf(transaction, { cashier: displayName });
    setTimeout(() => setDownloading(false), 1000);
  };

  const formatDate = (time: number) => {
    return new Date(time).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[420px] p-6 gap-4 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <DialogHeader className="items-center pb-2 border-b border-border/40">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-semibold tracking-tight text-center">
            Transaction Successful
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            Order has been processed and recorded.
          </DialogDescription>
        </DialogHeader>

        {/* Digital Receipt Container */}
        <div className="relative flex justify-center py-2">
          {/* Digital Paper Receipt */}
          <div className="relative w-full max-w-[320px] bg-[#fafaf9] text-zinc-900 p-5 shadow-lg border border-zinc-200/60 rounded-sm font-mono text-[11px] leading-relaxed select-none">
            {/* Top jagged border decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_40%,#eaeae8_40%)] bg-[length:8px_8px] bg-repeat-x -mt-0.5" />

            {/* Header info */}
            <div className="text-center mb-3">
              <div className="text-sm font-bold tracking-wider uppercase">CaféPOS</div>
              <div className="text-[9px] text-zinc-500">Premium Coffee & Café</div>
              <div className="border-t border-dashed border-zinc-300 my-2" />
            </div>

            {/* Meta */}
            <div className="space-y-1 mb-3 text-[10px]">
              <div className="flex justify-between">
                <span>Receipt:</span>
                <span className="font-semibold">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(transaction.time)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{displayName || "Staff"}</span>
              </div>
              <div className="border-t border-dashed border-zinc-300 my-2" />
            </div>

            {/* Items */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between font-bold text-[9px] uppercase text-zinc-500">
                <span>Item</span>
                <span>Amt</span>
              </div>
              <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                {transaction.items.map((item, idx) => (
                  <div key={item.lineId || idx} className="space-y-0.5">
                    <div className="font-medium text-zinc-800 break-words">{item.name}</div>
                    <div className="flex justify-between text-zinc-500">
                      <span>{item.qty} × ₱{item.price.toFixed(2)}</span>
                      <span className="font-semibold text-zinc-800">₱{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-300 my-2" />
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[10px] mb-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₱{transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Senior Discount ({transaction.discountPercent ?? 0}%)</span>
                  <span>-₱{transaction.discount.toFixed(2)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₱{transaction.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-zinc-300">
                <span>TOTAL</span>
                <span>₱{transaction.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-zinc-300 my-2" />

            {/* Footer details */}
            <div className="space-y-1 text-center text-[10px]">
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="font-bold">{transaction.payment.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Items sold</span>
                <span>{transaction.items.reduce((s, i) => s + i.qty, 0)}</span>
              </div>
              <div className="border-t border-dashed border-zinc-300 my-2" />
              <div className="text-[9px] text-zinc-500 mt-2">
                Thank you for your purchase!<br />Please come again.
              </div>
              {/* Barcode */}
              <div className="text-xs font-bold tracking-[0.25em] text-zinc-800 mt-2 uppercase">
                {transaction.id.replace("TX-", "").split("").join(" ")}
              </div>
            </div>
            
            {/* Bottom jagged border decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(circle,transparent_40%,#eaeae8_40%)] bg-[length:8px_8px] bg-repeat-x -mb-0.5 rotate-180" />
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="outline"
            className="h-9 gap-1.5 text-xs cursor-pointer border-border/80 hover:bg-accent"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Saving..." : "Save PDF"}
          </Button>
          <Button
            variant="default"
            className="h-9 gap-1.5 text-xs cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handlePrint}
            disabled={printing}
          >
            <Printer className="h-3.5 w-3.5" />
            {printing ? "Printing..." : "Print"}
          </Button>
        </div>

        <Button
          variant="secondary"
          className="w-full h-9 text-xs cursor-pointer mt-1"
          onClick={onClose}
        >
          Close & Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
