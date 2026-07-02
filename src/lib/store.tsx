import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products as seedProducts, inventory as seedInventory } from "./data";

export type Product = { id: string; name: string; price: number; cost: number; image: string };
export type InventoryItem = { name: string; available: string; status: "in" | "low" };
export type CartItem = { id: string; name: string; price: number; qty: number };
export type Notification = { id: string; message: string; time: number };

type Store = {
  products: Product[];
  inventory: InventoryItem[];
  cart: CartItem[];
  notifications: Notification[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  changeQty: (id: string, delta: number) => void;
  clearCart: () => void;
  addProduct: (p: Omit<Product, "id" | "image"> & { image?: string }) => void;
  addStock: (item: InventoryItem) => void;
  notify: (message: string) => void;
  clearNotifications: () => void;
};

const StoreContext = createContext<Store | null>(null);

const KEY = "mias-cafe-store-v1";

function loadInitial() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pick<Store, "products" | "inventory" | "cart" | "notifications">;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory);
  const [cart, setCart] = useState<CartItem[]>([
    { id: "iced-latte", name: "Iced Latte", price: 4.5, qty: 1 },
    { id: "spanish-latte", name: "Spanish Latte", price: 4.75, qty: 1 },
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "n1", message: "Fresh Milk stock is low", time: Date.now() - 3600_000 },
    { id: "n2", message: "Vanilla Syrup is very low — restock", time: Date.now() - 1800_000 },
  ]);

  // hydrate from localStorage
  useEffect(() => {
    const saved = loadInitial();
    if (saved) {
      // Reattach product images from seed by id (localStorage can't hold imports)
      const merged = saved.products.map((p) => ({
        ...p,
        image: seedProducts.find((sp) => sp.id === p.id)?.image ?? p.image,
      }));
      setProducts(merged.length ? merged : seedProducts);
      setInventory(saved.inventory ?? seedInventory);
      setCart(saved.cart ?? []);
      setNotifications(saved.notifications ?? []);
    }
  }, []);

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      KEY,
      JSON.stringify({ products, inventory, cart, notifications }),
    );
  }, [products, inventory, cart, notifications]);

  const value = useMemo<Store>(
    () => ({
      products,
      inventory,
      cart,
      notifications,
      addToCart: (p) =>
        setCart((c) => {
          const found = c.find((i) => i.id === p.id);
          if (found) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
          return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
        }),
      removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
      changeQty: (id, delta) =>
        setCart((c) =>
          c
            .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
            .filter((i) => i.qty > 0),
        ),
      clearCart: () => setCart([]),
      addProduct: (p) => {
        const id = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        setProducts((prev) => [
          ...prev,
          {
            id,
            name: p.name,
            price: p.price,
            cost: p.cost,
            image: p.image || seedProducts[0].image,
          },
        ]);
      },
      addStock: (item) =>
        setInventory((prev) => {
          const existing = prev.findIndex((i) => i.name.toLowerCase() === item.name.toLowerCase());
          if (existing >= 0) {
            const copy = [...prev];
            copy[existing] = item;
            return copy;
          }
          return [...prev, item];
        }),
      notify: (message) =>
        setNotifications((n) => [{ id: Math.random().toString(36).slice(2), message, time: Date.now() }, ...n]),
      clearNotifications: () => setNotifications([]),
    }),
    [products, inventory, cart, notifications],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
