import type { CartItem, Transaction } from "@/lib/store";
import { jsPDF } from "jspdf";

export type ReceiptOptions = {
  storeName?: string;
  storeTagline?: string;
  cashier?: string;
};

const DEFAULT_STORE = {
  name: "CafePOS",
  tagline: "Premium Coffee & Café",
};

function peso(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function formatReceiptDate(time: number) {
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

function buildReceiptHtml(tx: Transaction, options: ReceiptOptions = {}) {
  const storeName = options.storeName ?? DEFAULT_STORE.name;
  const storeTagline = options.storeTagline ?? DEFAULT_STORE.tagline;
  const cashier = options.cashier?.trim() || "Staff";
  const items = itemCount(tx.items);

  const lineRows = tx.items
    .map((item) => {
      const lineTotal = item.price * item.qty;
      return `
        <tr class="item-row">
          <td class="item-name" colspan="3">${escapeHtml(item.name)}</td>
        </tr>
        <tr class="item-row">
          <td class="item-qty">${item.qty} × ${peso(item.price)}</td>
          <td></td>
          <td class="item-amt">${peso(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  const discountRow =
    tx.discount > 0
      ? `
        <tr class="total-row">
          <td colspan="2">Senior discount (${tx.discountPercent ?? 0}%)</td>
          <td class="discount">-${peso(tx.discount)}</td>
        </tr>
      `
      : "";

  const taxRow =
    tx.tax > 0
      ? `
        <tr class="total-row">
          <td colspan="2">Tax</td>
          <td>${peso(tx.tax)}</td>
        </tr>
      `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(tx.id)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 6mm 4mm 8mm;
      color: #111;
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .brand {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .tagline {
      margin-top: 2px;
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    .divider {
      border: 0;
      border-top: 1px dashed #333;
      margin: 8px 0;
    }
    .divider-solid {
      border-top-style: solid;
    }
    .meta {
      font-size: 10px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 2px;
    }
    .meta-row span:last-child {
      text-align: right;
      white-space: nowrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .head-row td {
      padding-bottom: 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .head-row td:last-child {
      text-align: right;
    }
    .item-row td {
      padding: 1px 0;
      vertical-align: top;
    }
    .item-name {
      padding-top: 5px !important;
      font-weight: 600;
      word-break: break-word;
    }
    .item-qty {
      color: #333;
      font-size: 10px;
    }
    .item-amt {
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    .total-row td {
      padding: 2px 0;
    }
    .total-row td:last-child {
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    .discount {
      color: #166534;
    }
    .grand-total td {
      padding-top: 6px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .grand-total td:last-child {
      text-align: right;
    }
    .payment {
      margin-top: 8px;
      font-size: 10px;
    }
    .footer {
      margin-top: 10px;
      font-size: 10px;
      line-height: 1.5;
    }
    .barcode {
      margin-top: 10px;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.22em;
    }
    @media screen {
      body {
        background: #fff;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        margin: 24px auto;
      }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">${escapeHtml(storeName)}</div>
    <div class="tagline">${escapeHtml(storeTagline)}</div>
  </div>

  <hr class="divider" />

  <div class="meta">
    <div class="meta-row"><span>Receipt #</span><span>${escapeHtml(tx.id)}</span></div>
    <div class="meta-row"><span>Date</span><span>${escapeHtml(formatReceiptDate(tx.time))}</span></div>
    <div class="meta-row"><span>Cashier</span><span>${escapeHtml(cashier)}</span></div>
  </div>

  <hr class="divider" />

  <table>
    <tr class="head-row">
      <td>Item</td>
      <td></td>
      <td>Amount</td>
    </tr>
    ${lineRows}
  </table>

  <hr class="divider divider-solid" />

  <table>
    <tr class="total-row">
      <td colspan="2">Subtotal</td>
      <td>${peso(tx.subtotal)}</td>
    </tr>
    ${discountRow}
    ${taxRow}
    <tr class="grand-total">
      <td colspan="2">Total</td>
      <td>${peso(tx.total)}</td>
    </tr>
  </table>

  <div class="payment">
    <div class="meta-row"><span>Payment</span><span>${escapeHtml(tx.payment.toUpperCase())}</span></div>
    <div class="meta-row"><span>Items sold</span><span>${items}</span></div>
  </div>

  <hr class="divider" />

  <div class="footer center">
    <div>Thank you for your purchase!</div>
    <div>Please come again.</div>
    <div class="barcode">${escapeHtml(tx.id.replace("TX-", ""))}</div>
    <div style="margin-top: 6px; opacity: 0.65;">Powered by ${escapeHtml(storeName)}</div>
  </div>
</body>
</html>`;
}

export function printReceipt(tx: Transaction, options: ReceiptOptions = {}) {
  if (typeof window === "undefined") return false;

  const html = buildReceiptHtml(tx, options);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", `Receipt ${tx.id}`);
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const printFrame = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    }
  };

  if (iframe.contentWindow?.document.readyState === "complete") {
    printFrame();
  } else {
    iframe.onload = printFrame;
  }

  return true;
}

export function downloadReceiptPdf(tx: Transaction, options: ReceiptOptions = {}) {
  const storeName = options.storeName ?? DEFAULT_STORE.name;
  const storeTagline = options.storeTagline ?? DEFAULT_STORE.tagline;
  const cashier = options.cashier?.trim() || "Staff";

  const tempDoc = new jsPDF({
    unit: "mm",
    format: [80, 500],
  });
  tempDoc.setFont("courier", "normal");
  tempDoc.setFontSize(8);

  const leftMargin = 5;
  const rightMargin = 75;
  const contentWidth = rightMargin - leftMargin;

  const itemDetails = tx.items.map((item) => {
    const nameLines = tempDoc.splitTextToSize(item.name, contentWidth) as string[];
    const nameHeight = nameLines.length * 4;
    const detailHeight = 4;
    return {
      item,
      nameLines,
      height: nameHeight + detailHeight + 1,
    };
  });

  const totalItemsHeight = itemDetails.reduce((sum, d) => sum + d.height, 0);
  const staticHeight = 15 + 20 + 12 + 25 + 15 + 25 + 10;
  const pageHeight = Math.max(100, staticHeight + totalItemsHeight);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, pageHeight],
  });

  const centerText = (text: string, yVal: number) => {
    doc.text(text, 40, yVal, { align: "center" });
  };

  const leftRightText = (left: string, right: string, yVal: number) => {
    doc.text(left, leftMargin, yVal);
    doc.text(right, rightMargin, yVal, { align: "right" });
  };

  const dashedLine = (yVal: number, char = "-") => {
    const line = char.repeat(38);
    centerText(line, yVal);
  };

  let y = 8;

  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  centerText(storeName.toUpperCase(), y);
  y += 5;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  centerText(storeTagline, y);
  y += 4;

  dashedLine(y);
  y += 4;

  leftRightText("Receipt #", tx.id, y);
  y += 4;
  leftRightText("Date", formatReceiptDate(tx.time), y);
  y += 4;
  leftRightText("Cashier", cashier, y);
  y += 4;

  dashedLine(y);
  y += 4;

  doc.setFont("courier", "bold");
  leftRightText("Item", "Amount", y);
  y += 4;
  dashedLine(y);
  y += 4;

  doc.setFont("courier", "normal");
  itemDetails.forEach((detail) => {
    detail.nameLines.forEach((line) => {
      doc.text(line, leftMargin, y);
      y += 4;
    });
    const lineTotal = detail.item.price * detail.item.qty;
    const qtyText = `${detail.item.qty} x PHP ${detail.item.price.toFixed(2)}`;
    const amtText = `PHP ${lineTotal.toFixed(2)}`;
    doc.text(qtyText, leftMargin + 2, y);
    doc.text(amtText, rightMargin, y, { align: "right" });
    y += 5;
  });

  dashedLine(y, "=");
  y += 4;

  leftRightText("Subtotal", `PHP ${tx.subtotal.toFixed(2)}`, y);
  y += 4;

  if (tx.discount > 0) {
    const pct = tx.discountPercent ?? 0;
    leftRightText(`Senior discount (${pct}%)`, `-PHP ${tx.discount.toFixed(2)}`, y);
    y += 4;
  }

  if (tx.tax > 0) {
    leftRightText("Tax", `PHP ${tx.tax.toFixed(2)}`, y);
    y += 4;
  }

  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  leftRightText("TOTAL", `PHP ${tx.total.toFixed(2)}`, y);
  y += 5;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  dashedLine(y);
  y += 4;

  leftRightText("Payment", tx.payment.toUpperCase(), y);
  y += 4;
  leftRightText("Items sold", String(tx.items.reduce((s, i) => s + i.qty, 0)), y);
  y += 4;

  dashedLine(y);
  y += 4;

  centerText("Thank you for your purchase!", y);
  y += 4;
  centerText("Please come again.", y);
  y += 4;

  doc.setFont("courier", "bold");
  doc.setFontSize(14);
  const barcodeStr = tx.id.replace("TX-", "");
  const spacedBarcode = barcodeStr.split("").join("  ");
  centerText(spacedBarcode, y + 2);
  y += 8;

  doc.setFont("courier", "normal");
  doc.setFontSize(6);
  centerText(`Powered by ${storeName}`, y);

  doc.save(`receipt-${tx.id}.pdf`);
}
