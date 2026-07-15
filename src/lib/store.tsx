import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products as seedProducts, inventory as seedInventory, PLACEHOLDER_IMAGE } from "./data";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { toast } from "sonner";
import { getProductCategory, normalizeSizePrices, getPriceForSize, type SizePrices } from "./categories";

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  image: string;
  category: string;
  /** Per-oz sell prices for Hot/Cold (e.g. { "8oz": 70, "12oz": 80, "16oz": 100 }) */
  sizePrices?: SizePrices;
};
export type InventoryItem = { name: string; available: string; status: "in" | "low"; image?: string };
export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  /** Cup size when ordered as Hot/Cold (e.g. 12oz) */
  size?: string;
  /** Unique cart line key: productId or productId::size */
  lineId: string;
};

export function cartLineId(productId: string, size?: string) {
  return size ? `${productId}::${size}` : productId;
}
export type Notification = { id: string; message: string; time: number };

const NOTIF_READ_PREFIX = "mias-cafe-notif-read-";

function loadReadIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(NOTIF_READ_PREFIX + userId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIF_READ_PREFIX + userId, JSON.stringify([...ids]));
}

export type Transaction = {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment: string;
  time: number;
  status: "completed" | "voided";
};

type Store = {
  products: Product[];
  inventory: InventoryItem[];
  cart: CartItem[];
  notifications: Notification[];
  unreadCount: number;
  transactions: Transaction[];
  loading: boolean;
  isAdmin: boolean;
  role: "superadmin" | "admin" | "barista";
  displayName: string;
  addToCart: (p: Product, options?: { size?: string }) => void;
  removeFromCart: (lineId: string) => void;
  changeQty: (lineId: string, delta: number) => void;
  clearCart: () => void;
  addProduct: (p: Omit<Product, "id" | "image"> & { image?: string }) => void;
  deleteProduct: (id: string) => void;
  updateProduct: (id: string, p: Omit<Product, "id" | "image"> & { image?: string }) => void;
  addStock: (item: InventoryItem) => void;
  deleteStock: (name: string) => void;
  notify: (message: string) => void;
  clearNotifications: () => void;
  isNotificationRead: (id: string) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addTransaction: (
    items: CartItem[],
    subtotal: number,
    tax: number,
    total: number,
    payment: string,
  ) => void;
  voidTransaction: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const CART_KEY = "mias-cafe-cart-v1";

/** Merge DB products with local asset images and fill missing category via auto-detection */
function mergeImages(dbProducts: Array<Product & { size_prices?: unknown }>): Product[] {
  return dbProducts.map((p) => {
    const category = getProductCategory(p.category, p.name);
    const price = Number(p.price) || 0;
    return {
      ...p,
      price,
      cost: Number(p.cost) || 0,
      image: seedProducts.find((sp) => sp.id === p.id)?.image || p.image || PLACEHOLDER_IMAGE,
      category,
      sizePrices: normalizeSizePrices(
        (p as { size_prices?: unknown }).size_prices ?? p.sizePrices,
        price,
        category,
      ),
    };
  });
}

/** Normalize a raw Supabase transaction row into the Transaction shape the UI expects */
function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  let items: CartItem[] = [];
  const rawItems = raw.items;
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems) as unknown;
      items = Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      items = [];
    }
  } else if (Array.isArray(rawItems)) {
    items = rawItems as CartItem[];
  }

  items = items.map((item) => ({
    ...item,
    price: Number(item.price) || 0,
    qty: Number(item.qty) || 0,
    lineId: item.lineId || cartLineId(String(item.id ?? ""), item.size),
    size: item.size || undefined,
  }));

  const status = raw.status === "voided" ? "voided" : "completed";

  return {
    id: String(raw.id ?? ""),
    items,
    subtotal: Number(raw.subtotal) || 0,
    tax: Number(raw.tax) || 0,
    total: Number(raw.total) || 0,
    payment: String(raw.payment ?? ""),
    time: Number(raw.time) || 0,
    status,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAdmin, role, displayName, user } = useAuth();

  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) setReadIds(loadReadIds(user.id));
    else setReadIds(new Set());
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds],
  );

  // ── Fetch from Supabase on mount ──────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [prodRes, invRes, txRes, notifRes] = await Promise.all([
          // Only load rows that have NOT been soft-deleted
          supabase.from("products").select("*").is("deleted_at", null),
          supabase.from("inventory").select("name, available, status, image").is("deleted_at", null),
          supabase.from("transactions").select("*").order("time", { ascending: false }),
          supabase.from("notifications").select("*").order("time", { ascending: false }),
        ]);

        if (prodRes.data && prodRes.data.length > 0) {
          setProducts(mergeImages(prodRes.data as Product[]));
        }
        if (invRes.data && invRes.data.length > 0) {
          setInventory(invRes.data as InventoryItem[]);
        }
        if (txRes.data) {
          setTransactions(
            (txRes.data as Record<string, unknown>[]).map(normalizeTransaction),
          );
        }
        if (notifRes.data) {
          setNotifications(notifRes.data as Notification[]);
        }
      } catch (err) {
        console.error("Supabase fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Persist cart to localStorage (ephemeral, session-only) ─
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartItem[];
        setCart(
          parsed.map((i) => ({
            ...i,
            lineId: i.lineId || cartLineId(i.id, i.size),
          })),
        );
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const value = useMemo<Store>(
    () => ({
      products,
      inventory,
      cart,
      notifications,
      unreadCount,
      transactions,
      loading,
      isAdmin,
      role,
      displayName,
      addToCart: (p, options) =>
        setCart((c) => {
          const size = options?.size;
          const lineId = cartLineId(p.id, size);
          const unitPrice = getPriceForSize(p, size);
          const displayName = size ? `${p.name} · ${size}` : p.name;
          const found = c.find((i) => i.lineId === lineId);
          if (found) {
            return c.map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + 1 } : i));
          }
          return [
            ...c,
            {
              id: p.id,
              name: displayName,
              price: unitPrice,
              qty: 1,
              size,
              lineId,
            },
          ];
        }),
      removeFromCart: (lineId) => setCart((c) => c.filter((i) => i.lineId !== lineId)),
      changeQty: (lineId, delta) =>
        setCart((c) =>
          c
            .map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0),
        ),
      clearCart: () => setCart([]),

      // ── addProduct: admin-only ─────────────────────────────
      addProduct: (p) => {
        if (!isAdmin) {
          toast.error("Only admins can add products.");
          return;
        }
        const id = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const category = getProductCategory(p.category, p.name);
        const sizePrices = normalizeSizePrices(p.sizePrices, p.price, category);
        const newProd: Product = {
          id,
          name: p.name,
          price: p.price,
          cost: p.cost,
          category,
          image: p.image || PLACEHOLDER_IMAGE,
          sizePrices,
        };
        setProducts((prev) => [...prev, newProd]);

        supabase
          .from("products")
          .upsert({
            id,
            name: p.name,
            price: p.price,
            cost: p.cost,
            category,
            image: p.image || "",
            size_prices: sizePrices ?? null,
          })
          .then(({ error }) => {
            if (error) console.error("Supabase addProduct error:", error);
          });
      },

      // ── deleteProduct: admin-only (soft-delete) ───────────
      deleteProduct: (id) => {
        if (!isAdmin) {
          toast.error("Only admins can delete products.");
          return;
        }
        const target = products.find((p) => p.id === id);
        if (!target) return;

        // Remove from UI immediately
        setProducts((prev) => prev.filter((p) => p.id !== id));

        const now = new Date().toISOString();

        // Soft-delete: just stamp deleted_at / deleted_by
        supabase
          .from("products")
          .update({ deleted_at: now, deleted_by: displayName })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Supabase softDelete product error:", error);
          });

        // Write a permanent audit-log entry
        supabase
          .from("deletion_audit")
          .insert({
            table_name: "products",
            record_id: target.id,
            record_name: target.name,
            deleted_by: displayName,
            deleted_at: now,
            snapshot: target,
          })
          .then(({ error }) => {
            if (error) console.error("Supabase audit log error:", error);
          });
      },

      // ── updateProduct: admin-only ──────────────────────────
      updateProduct: (id, p) => {
        if (!isAdmin) {
          toast.error("Only admins can edit products.");
          return;
        }
        const category = getProductCategory(p.category, p.name);
        const sizePrices = normalizeSizePrices(p.sizePrices, p.price, category);
        setProducts((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  name: p.name,
                  price: p.price,
                  cost: p.cost,
                  category,
                  sizePrices,
                  image:
                    p.image !== undefined ? p.image || PLACEHOLDER_IMAGE : item.image,
                }
              : item,
          ),
        );
        const updatePayload: Record<string, unknown> = {
          name: p.name,
          price: p.price,
          cost: p.cost,
          category,
          size_prices: sizePrices ?? null,
        };
        if (p.image !== undefined) {
          updatePayload.image = p.image;
        }
        supabase
          .from("products")
          .update(updatePayload)
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Supabase updateProduct error:", error);
          });
      },

      // ── addStock: admin-only ───────────────────────────────
      addStock: (item) => {
        if (!isAdmin && role !== "barista") {
          toast.error("Only admins and baristas can update stock.");
          return;
        }
        setInventory((prev) => {
          const existing = prev.findIndex((i) => i.name.toLowerCase() === item.name.toLowerCase());
          if (existing >= 0) {
            const copy = [...prev];
            copy[existing] = item;
            return copy;
          }
          return [...prev, item];
        });

        supabase
          .from("inventory")
          .upsert(
            { name: item.name, available: item.available, status: item.status, image: item.image || "" },
            { onConflict: "name" },
          )
          .then(({ error }) => {
            if (error) console.error("Supabase addStock error:", error);
          });
      },

      // ── deleteStock: admin-only (soft-delete) ─────────────
      deleteStock: (name) => {
        if (!isAdmin) {
          toast.error("Only admins can delete stock.");
          return;
        }
        const target = inventory.find((item) => item.name.toLowerCase() === name.toLowerCase());

        // Remove from UI immediately
        setInventory((prev) =>
          prev.filter((item) => item.name.toLowerCase() !== name.toLowerCase()),
        );

        const now = new Date().toISOString();

        // Soft-delete: stamp deleted_at / deleted_by
        supabase
          .from("inventory")
          .update({ deleted_at: now, deleted_by: displayName })
          .eq("name", name)
          .then(({ error }) => {
            if (error) console.error("Supabase softDelete inventory error:", error);
          });

        // Write a permanent audit-log entry
        if (target) {
          supabase
            .from("deletion_audit")
            .insert({
              table_name: "inventory",
              record_id: target.name,
              record_name: target.name,
              deleted_by: displayName,
              deleted_at: now,
              snapshot: target,
            })
            .then(({ error }) => {
              if (error) console.error("Supabase audit log error:", error);
            });
        }
      },

      // ── notify: write to Supabase ─────────────────────────
      notify: (message) => {
        const notif: Notification = {
          id: Math.random().toString(36).slice(2),
          message,
          time: Date.now(),
        };
        setNotifications((n) => [notif, ...n]);

        supabase
          .from("notifications")
          .insert({ id: notif.id, message: notif.message, time: notif.time })
          .then(({ error }) => {
            if (error) console.error("Supabase notify error:", error);
          });
      },

      // ── clearNotifications: admin-only ─────────────────────
      clearNotifications: () => {
        if (!isAdmin) {
          toast.error("Only admins can clear notifications.");
          return;
        }
        setNotifications([]);

        supabase
          .from("notifications")
          .delete()
          .neq("id", "")
          .then(({ error }) => {
            if (error) console.error("Supabase clearNotifications error:", error);
          });
      },

      isNotificationRead: (id) => readIds.has(id),

      markNotificationRead: (id) => {
        setReadIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          if (user?.id) saveReadIds(user.id, next);
          return next;
        });
      },

      markAllNotificationsRead: () => {
        setReadIds((prev) => {
          const next = new Set(prev);
          for (const n of notifications) next.add(n.id);
          if (user?.id) saveReadIds(user.id, next);
          return next;
        });
      },

      // ── addTransaction: everyone can create sales ──────────
      addTransaction: (items, subtotal, tax, total, payment) => {
        const txId = "TX-" + Math.floor(1000 + Math.random() * 9000);
        const newTx: Transaction = {
          id: txId,
          items,
          subtotal,
          tax,
          total,
          payment,
          time: Date.now(),
          status: "completed",
        };
        setTransactions((prev) => [newTx, ...prev]);

        supabase
          .from("transactions")
          .insert({
            id: txId,
            // Pass array directly — JSONB column; stringifying nests a string
            items,
            subtotal,
            tax,
            total,
            payment,
            time: newTx.time,
            status: "completed",
          })
          .then(({ error }) => {
            if (error) console.error("Supabase addTransaction error:", error);
          });
      },

      // ── voidTransaction: admin-only ────────────────────────
      voidTransaction: (id) => {
        if (!isAdmin) {
          toast.error("Only admins can void transactions.");
          return;
        }
        setTransactions((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "voided" as const } : t)),
        );

        supabase
          .from("transactions")
          .update({ status: "voided" })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Supabase voidTransaction error:", error);
          });
      },
    }),
    [products, inventory, cart, notifications, unreadCount, readIds, transactions, loading, isAdmin, role, displayName, user?.id],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
