import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { products as seedProducts, inventory as seedInventory, PLACEHOLDER_IMAGE } from "./data";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { toast } from "sonner";
import {
  type MenuCategory,
  type CategoryVariant,
  type Syrup,
  type VariantPrices,
  type SizePrices,
  resolveCategoryId,
  getCategoryName,
  normalizeVariantPrices,
  normalizeSizePrices,
  getUnitPrice,
  toSlug,
  variantsForCategory,
} from "./categories";

export type { MenuCategory, CategoryVariant, Syrup, VariantPrices, SizePrices };

export type Product = {
  id: string;
  name: string;
  price: number;
  cost: number;
  image: string;
  categoryId: string;
  category: string;
  variantPrices?: VariantPrices;
  sizePrices?: SizePrices;
};

export type InventoryItem = { name: string; available: string; status: "in" | "low"; image?: string };

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  variant?: string;
  variantId?: string;
  size?: string;
  syrup?: string;
  syrupId?: string;
  lineId: string;
};

export function cartLineId(
  productId: string,
  variantId?: string,
  size?: string,
  syrupId?: string,
) {
  const parts = [productId];
  if (variantId) parts.push(variantId);
  if (size) parts.push(size);
  if (syrupId) parts.push(syrupId);
  return parts.join("::");
}

export type Notification = { id: string; message: string; time: number };

const NOTIF_READ_PREFIX = "mias-cafe-notif-read-";
const CART_KEY = "mias-cafe-cart-v2";
const TX_PAGE_SIZE = 200;
const NOTIF_LIMIT = 100;

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
  discount: number;
  tax: number;
  total: number;
  payment: string;
  time: number;
  status: "completed" | "voided";
  seniorDiscount?: boolean;
  discountPercent?: number;
};

type Store = {
  products: Product[];
  menuCategories: MenuCategory[];
  categoryVariants: CategoryVariant[];
  syrups: Syrup[];
  inventory: InventoryItem[];
  cart: CartItem[];
  notifications: Notification[];
  unreadCount: number;
  transactions: Transaction[];
  loading: boolean;
  seniorDiscountPercent: number;
  isAdmin: boolean;
  role: "superadmin" | "admin" | "barista";
  displayName: string;
  addToCart: (p: Product, options?: { variantId?: string; size?: string; syrupId?: string }) => void;
  removeFromCart: (lineId: string) => void;
  changeQty: (lineId: string, delta: number) => void;
  clearCart: () => void;
  addProduct: (p: Omit<Product, "id" | "image" | "category"> & { image?: string }) => void;
  deleteProduct: (id: string) => void;
  updateProduct: (id: string, p: Omit<Product, "id" | "image" | "category"> & { image?: string }) => void;
  addCategory: (name: string, supportsSyrup?: boolean) => Promise<void>;
  updateCategory: (id: string, patch: { name?: string; supports_syrup?: boolean; sort_order?: number }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addVariant: (categoryId: string, name: string) => Promise<void>;
  updateVariant: (id: string, patch: { name?: string; sort_order?: number }) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;
  addSyrup: (name: string, price?: number) => Promise<void>;
  updateSyrup: (id: string, patch: { name?: string; price?: number; enabled?: boolean; sort_order?: number }) => Promise<void>;
  deleteSyrup: (id: string) => Promise<void>;
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
    discount: number,
    tax: number,
    total: number,
    payment: string,
    meta?: { seniorDiscount?: boolean; discountPercent?: number },
  ) => Transaction;
  updateSeniorDiscountPercent: (percent: number) => Promise<void>;
  voidTransaction: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

type DbProduct = Product & {
  category_id?: string;
  variant_prices?: unknown;
  size_prices?: unknown;
  deleted_at?: string | null;
};

function mergeProducts(
  dbProducts: DbProduct[],
  categories: MenuCategory[],
  variants: CategoryVariant[],
): Product[] {
  return dbProducts.map((p) => {
    const price = Number(p.price) || 0;
    const categoryId = resolveCategoryId(
      p.categoryId ?? p.category_id ?? p.category,
      categories,
      p.name,
    );
    const category = getCategoryName(categoryId, categories);
    return {
      id: p.id,
      name: p.name,
      price,
      cost: Number(p.cost) || 0,
      image: seedProducts.find((sp) => sp.id === p.id)?.image || p.image || PLACEHOLDER_IMAGE,
      categoryId,
      category,
      variantPrices: normalizeVariantPrices(
        p.variantPrices ?? p.variant_prices,
        price,
        categoryId,
        variants,
      ),
      sizePrices: normalizeSizePrices(
        p.sizePrices ?? p.size_prices,
        price,
        categoryId,
      ),
    };
  });
}

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
    lineId:
      item.lineId ||
      cartLineId(
        String(item.id ?? ""),
        item.variantId,
        item.size,
        item.syrupId,
      ),
    variant: item.variant || undefined,
    variantId: item.variantId || undefined,
    size: item.size || undefined,
    syrup: item.syrup || undefined,
    syrupId: item.syrupId || undefined,
  }));

  return {
    id: String(raw.id ?? ""),
    items,
    subtotal: Number(raw.subtotal) || 0,
    discount: Number(raw.discount) || 0,
    tax: Number(raw.tax) || 0,
    total: Number(raw.total) || 0,
    payment: String(raw.payment ?? ""),
    time: Number(raw.time) || 0,
    status: raw.status === "voided" ? "voided" : "completed",
    seniorDiscount: raw.senior_discount === true || raw.seniorDiscount === true,
    discountPercent:
      raw.discount_percent != null
        ? Number(raw.discount_percent)
        : raw.discountPercent != null
          ? Number(raw.discountPercent)
          : undefined,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isAdmin, role, displayName, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoryVariants, setCategoryVariants] = useState<CategoryVariant[]>([]);
  const [syrups, setSyrups] = useState<Syrup[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(seedInventory);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [seniorDiscountPercent, setSeniorDiscountPercent] = useState(20);

  const productsRef = useRef(products);
  const inventoryRef = useRef(inventory);
  const notificationsRef = useRef(notifications);
  const menuCategoriesRef = useRef(menuCategories);
  const categoryVariantsRef = useRef(categoryVariants);
  const syrupsRef = useRef(syrups);

  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { menuCategoriesRef.current = menuCategories; }, [menuCategories]);
  useEffect(() => { categoryVariantsRef.current = categoryVariants; }, [categoryVariants]);
  useEffect(() => { syrupsRef.current = syrups; }, [syrups]);

  const isAdminRef = useRef(isAdmin);
  const displayNameRef = useRef(displayName);
  const roleRef = useRef(role);
  const userRef = useRef(user);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);
  useEffect(() => { displayNameRef.current = displayName; }, [displayName]);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (user?.id) setReadIds(loadReadIds(user.id));
    else setReadIds(new Set());
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds],
  );

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [catRes, varRes, syrupRes, prodRes, invRes, txRes, notifRes, settingsRes] = await Promise.all([
          supabase.from("menu_categories").select("*").is("deleted_at", null).order("sort_order"),
          supabase.from("category_variants").select("*").is("deleted_at", null).order("sort_order"),
          supabase.from("syrups").select("*").is("deleted_at", null).order("sort_order"),
          supabase.from("products").select("*").is("deleted_at", null),
          supabase.from("inventory").select("name, available, status, image").is("deleted_at", null),
          supabase.from("transactions").select("*").order("time", { ascending: false }).limit(TX_PAGE_SIZE),
          supabase.from("notifications").select("*").order("time", { ascending: false }).limit(NOTIF_LIMIT),
          supabase.from("app_settings").select("*").eq("key", "senior_discount_percent").maybeSingle(),
        ]);

        const cats = (catRes.data ?? []) as MenuCategory[];
        const vars = (varRes.data ?? []) as CategoryVariant[];
        const syps = ((syrupRes.data ?? []) as Syrup[]).map((s) => ({
          ...s,
          price: Number(s.price) || 0,
        }));

        if (catRes.data) setMenuCategories(cats);
        if (varRes.data) setCategoryVariants(vars);
        if (syrupRes.data) setSyrups(syps);
        if (prodRes.data) {
          setProducts(mergeProducts(prodRes.data as DbProduct[], cats, vars));
        }
        if (invRes.data && invRes.data.length > 0) setInventory(invRes.data as InventoryItem[]);
        if (txRes.data) setTransactions((txRes.data as Record<string, unknown>[]).map(normalizeTransaction));
        if (notifRes.data) setNotifications(notifRes.data as Notification[]);
        if (settingsRes.data?.value != null) {
          const pct = Number(settingsRes.data.value);
          if (!Number.isNaN(pct) && pct >= 0 && pct <= 100) setSeniorDiscountPercent(pct);
        }
      } catch (err) {
        console.error("Supabase fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // ── Realtime ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("store-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setMenuCategories((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id));
        } else {
          const row = payload.new as MenuCategory;
          if (row.deleted_at) {
            setMenuCategories((prev) => prev.filter((c) => c.id !== row.id));
          } else {
            setMenuCategories((prev) => {
              const idx = prev.findIndex((c) => c.id === row.id);
              if (idx === -1) return [...prev, row].sort((a, b) => a.sort_order - b.sort_order);
              const next = [...prev];
              next[idx] = row;
              return next.sort((a, b) => a.sort_order - b.sort_order);
            });
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "category_variants" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setCategoryVariants((prev) => prev.filter((v) => v.id !== (payload.old as { id: string }).id));
        } else {
          const row = payload.new as CategoryVariant;
          if (row.deleted_at) {
            setCategoryVariants((prev) => prev.filter((v) => v.id !== row.id));
          } else {
            setCategoryVariants((prev) => {
              const idx = prev.findIndex((v) => v.id === row.id);
              if (idx === -1) return [...prev, row];
              const next = [...prev];
              next[idx] = row;
              return next;
            });
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "syrups" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setSyrups((prev) => prev.filter((s) => s.id !== (payload.old as { id: string }).id));
        } else {
          const row = payload.new as Syrup;
          if (row.deleted_at) {
            setSyrups((prev) => prev.filter((s) => s.id !== row.id));
          } else {
            setSyrups((prev) => {
              const idx = prev.findIndex((s) => s.id === row.id);
              if (idx === -1) return [...prev, row];
              const next = [...prev];
              next[idx] = row;
              return next;
            });
          }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const newTx = normalizeTransaction(payload.new as Record<string, unknown>);
        setTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) return prev;
          return [newTx, ...prev].slice(0, TX_PAGE_SIZE);
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions" }, (payload) => {
        const updated = normalizeTransaction(payload.new as Record<string, unknown>);
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const n = payload.new as Notification;
        setNotifications((prev) => {
          if (prev.some((x) => x.id === n.id)) return prev;
          return [n, ...prev].slice(0, NOTIF_LIMIT);
        });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, () => {
        setNotifications([]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const p = payload.new as DbProduct;
          if (p.deleted_at) {
            setProducts((prev) => prev.filter((x) => x.id !== p.id));
          } else {
            const merged = mergeProducts([p], menuCategoriesRef.current, categoryVariantsRef.current)[0]!;
            setProducts((prev) => {
              const idx = prev.findIndex((x) => x.id === merged.id);
              if (idx === -1) return [...prev, merged];
              const next = [...prev];
              next[idx] = merged;
              return next;
            });
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setInventory((prev) => prev.filter((i) => i.name !== (payload.old as { name?: string }).name));
        } else {
          const item = payload.new as InventoryItem & { deleted_at?: string };
          if (item.deleted_at) {
            setInventory((prev) => prev.filter((i) => i.name !== item.name));
          } else {
            setInventory((prev) => {
              const idx = prev.findIndex((i) => i.name === item.name);
              if (idx === -1) return [...prev, item];
              const next = [...prev];
              next[idx] = item;
              return next;
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Re-merge products when categories/variants load after products
  useEffect(() => {
    if (menuCategories.length === 0) return;
    setProducts((prev) => {
      if (prev.length === 0) return prev;
      return mergeProducts(prev as DbProduct[], menuCategories, categoryVariants);
    });
  }, [menuCategories, categoryVariants]);

  // ── Cart persistence ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(CART_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartItem[];
        setCart(
          parsed.map((i) => ({
            ...i,
            lineId: i.lineId || cartLineId(i.id, i.variantId, i.size, i.syrupId),
          })),
        );
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((p: Product, options?: { variantId?: string; size?: string; syrupId?: string }) => {
    const variantId = options?.variantId;
    const size = options?.size;
    const syrupId = options?.syrupId;
    const variants = categoryVariantsRef.current;
    const syps = syrupsRef.current;
    const variant = variantId ? variants.find((v) => v.id === variantId) : undefined;
    const syrup = syrupId ? syps.find((s) => s.id === syrupId) : undefined;
    const unitPrice = getUnitPrice(
      p,
      { variantId, size, syrupPrice: syrup?.price ?? 0 },
      variants,
    );
    const lineId = cartLineId(p.id, variantId, size, syrupId);

    let displayName = p.name;
    if (variant) displayName += ` · ${variant.name}`;
    if (size) displayName += ` · ${size}`;
    if (syrup) displayName += ` · ${syrup.name}`;

    setCart((c) => {
      const found = c.find((i) => i.lineId === lineId);
      if (found) return c.map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...c,
        {
          id: p.id,
          name: displayName,
          price: unitPrice,
          qty: 1,
          variant: variant?.name,
          variantId,
          size,
          syrup: syrup?.name,
          syrupId,
          lineId,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((lineId: string) => {
    setCart((c) => c.filter((i) => i.lineId !== lineId));
  }, []);

  const changeQty = useCallback((lineId: string, delta: number) => {
    setCart((c) =>
      c.map((i) => (i.lineId === lineId ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0),
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const addProduct = useCallback(
    (p: Omit<Product, "id" | "image" | "category"> & { image?: string }) => {
      if (!isAdminRef.current) { toast.error("Only admins can add products."); return; }
      const id = toSlug(p.name);
      const cats = menuCategoriesRef.current;
      const vars = categoryVariantsRef.current;
      const categoryId = p.categoryId;
      const category = getCategoryName(categoryId, cats);
      const variantPrices = normalizeVariantPrices(p.variantPrices, p.price, categoryId, vars);
      const sizePrices = normalizeSizePrices(p.sizePrices, p.price, categoryId);
      const newProd: Product = {
        id, name: p.name, price: p.price, cost: p.cost, categoryId, category,
        image: p.image || PLACEHOLDER_IMAGE, variantPrices, sizePrices,
      };
      setProducts((prev) => [...prev, newProd]);
      supabase.from("products").upsert({
        id, name: p.name, price: p.price, cost: p.cost,
        category_id: categoryId, category, image: p.image || "",
        variant_prices: variantPrices ?? null,
        size_prices: sizePrices ?? null,
      }).then(({ error }) => { if (error) console.error("Supabase addProduct error:", error); });
    },
    [],
  );

  const deleteProduct = useCallback((id: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can delete products."); return; }
    const target = productsRef.current.find((p) => p.id === id);
    if (!target) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    const now = new Date().toISOString();
    supabase.from("products").update({ deleted_at: now, deleted_by: displayNameRef.current }).eq("id", id)
      .then(({ error }) => { if (error) console.error("Supabase softDelete product error:", error); });
    supabase.from("deletion_audit").insert({
      table_name: "products", record_id: target.id, record_name: target.name,
      deleted_by: displayNameRef.current, deleted_at: now, snapshot: target,
    }).then(({ error }) => { if (error) console.error("Supabase audit log error:", error); });
  }, []);

  const updateProduct = useCallback(
    (id: string, p: Omit<Product, "id" | "image" | "category"> & { image?: string }) => {
      if (!isAdminRef.current) { toast.error("Only admins can edit products."); return; }
      const cats = menuCategoriesRef.current;
      const vars = categoryVariantsRef.current;
      const categoryId = p.categoryId;
      const category = getCategoryName(categoryId, cats);
      const variantPrices = normalizeVariantPrices(p.variantPrices, p.price, categoryId, vars);
      const sizePrices = normalizeSizePrices(p.sizePrices, p.price, categoryId);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item, name: p.name, price: p.price, cost: p.cost,
                categoryId, category, variantPrices, sizePrices,
                image: p.image !== undefined ? p.image || PLACEHOLDER_IMAGE : item.image,
              }
            : item,
        ),
      );
      const payload: Record<string, unknown> = {
        name: p.name, price: p.price, cost: p.cost,
        category_id: categoryId, category,
        variant_prices: variantPrices ?? null,
        size_prices: sizePrices ?? null,
      };
      if (p.image !== undefined) payload.image = p.image;
      supabase.from("products").update(payload).eq("id", id)
        .then(({ error }) => { if (error) console.error("Supabase updateProduct error:", error); });
    },
    [],
  );

  // ── Category CRUD ──────────────────────────────────────────
  const addCategory = useCallback(async (name: string, supportsSyrup = false) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage categories."); return; }
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Category name is required."); return; }
    const dup = menuCategoriesRef.current.some(
      (c) => !c.deleted_at && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (dup) { toast.error("A category with this name already exists."); return; }
    const id = toSlug(trimmed);
    const sort_order = menuCategoriesRef.current.length + 1;
    const row: MenuCategory = { id, name: trimmed.toUpperCase(), sort_order, supports_syrup: supportsSyrup };
    setMenuCategories((prev) => [...prev, row]);
    const { error } = await supabase.from("menu_categories").insert({ id, name: row.name, sort_order, supports_syrup: supportsSyrup });
    if (error) { console.error(error); toast.error("Failed to add category."); }
    else toast.success(`Category "${row.name}" added`);
  }, []);

  const updateCategory = useCallback(async (id: string, patch: { name?: string; supports_syrup?: boolean; sort_order?: number }) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage categories."); return; }
    if (patch.name) {
      const dup = menuCategoriesRef.current.some(
        (c) => c.id !== id && !c.deleted_at && c.name.toLowerCase() === patch.name!.toLowerCase(),
      );
      if (dup) { toast.error("A category with this name already exists."); return; }
    }
    setMenuCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, name: patch.name ? patch.name.toUpperCase() : c.name } : c)));
    const { error } = await supabase.from("menu_categories").update(patch.name ? { ...patch, name: patch.name.toUpperCase() } : patch).eq("id", id);
    if (error) { console.error(error); toast.error("Failed to update category."); }
    else toast.success("Category updated");
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage categories."); return; }
    const now = new Date().toISOString();
    setMenuCategories((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("menu_categories").update({ deleted_at: now, deleted_by: displayNameRef.current }).eq("id", id);
    if (error) { console.error(error); toast.error("Failed to delete category."); }
    else toast.success("Category deleted");
  }, []);

  const addVariant = useCallback(async (categoryId: string, name: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage variants."); return; }
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Variant name is required."); return; }
    const existing = variantsForCategory(categoryId, categoryVariantsRef.current);
    if (existing.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This variant already exists for this category."); return;
    }
    const id = `${categoryId}-${toSlug(trimmed)}`;
    const sort_order = existing.length + 1;
    const row: CategoryVariant = { id, category_id: categoryId, name: trimmed, sort_order };
    setCategoryVariants((prev) => [...prev, row]);
    const { error } = await supabase.from("category_variants").insert(row);
    if (error) { console.error(error); toast.error("Failed to add variant."); }
    else toast.success(`Variant "${trimmed}" added`);
  }, []);

  const updateVariant = useCallback(async (id: string, patch: { name?: string; sort_order?: number }) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage variants."); return; }
    const variant = categoryVariantsRef.current.find((v) => v.id === id);
    if (!variant) return;
    if (patch.name) {
      const siblings = variantsForCategory(variant.category_id, categoryVariantsRef.current);
      if (siblings.some((v) => v.id !== id && v.name.toLowerCase() === patch.name!.toLowerCase())) {
        toast.error("This variant name already exists."); return;
      }
    }
    setCategoryVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    const { error } = await supabase.from("category_variants").update(patch).eq("id", id);
    if (error) { console.error(error); toast.error("Failed to update variant."); }
    else toast.success("Variant updated");
  }, []);

  const deleteVariant = useCallback(async (id: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage variants."); return; }
    const now = new Date().toISOString();
    setCategoryVariants((prev) => prev.filter((v) => v.id !== id));
    const { error } = await supabase.from("category_variants").update({ deleted_at: now }).eq("id", id);
    if (error) { console.error(error); toast.error("Failed to delete variant."); }
    else toast.success("Variant deleted");
  }, []);

  // ── Syrup CRUD ─────────────────────────────────────────────
  const addSyrup = useCallback(async (name: string, price = 0) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage syrups."); return; }
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Syrup name is required."); return; }
    if (syrupsRef.current.some((s) => !s.deleted_at && s.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A syrup with this name already exists."); return;
    }
    const id = toSlug(trimmed);
    const sort_order = syrupsRef.current.length + 1;
    const syrupPrice = Number(price) || 0;
    const row: Syrup = { id, name: trimmed, price: syrupPrice, enabled: true, sort_order };
    setSyrups((prev) => [...prev, row]);
    const { error } = await supabase.from("syrups").insert(row);
    if (error) { console.error(error); toast.error(error.message || "Failed to add syrup."); }
    else toast.success(`Syrup "${trimmed}" added`);
  }, []);

  const updateSyrup = useCallback(async (id: string, patch: { name?: string; price?: number; enabled?: boolean; sort_order?: number }) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage syrups."); return; }
    if (patch.name) {
      if (syrupsRef.current.some((s) => s.id !== id && !s.deleted_at && s.name.toLowerCase() === patch.name!.toLowerCase())) {
        toast.error("A syrup with this name already exists."); return;
      }
    }
    setSyrups((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const { error } = await supabase.from("syrups").update(patch).eq("id", id);
    if (error) { console.error(error); toast.error(error.message || "Failed to update syrup."); }
    else toast.success("Syrup updated");
  }, []);

  const deleteSyrup = useCallback(async (id: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can manage syrups."); return; }
    const now = new Date().toISOString();
    setSyrups((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase.from("syrups").update({ deleted_at: now, deleted_by: displayNameRef.current }).eq("id", id);
    if (error) { console.error(error); toast.error("Failed to delete syrup."); }
    else toast.success("Syrup deleted");
  }, []);

  const addStock = useCallback((item: InventoryItem) => {
    if (!isAdminRef.current && roleRef.current !== "barista") { toast.error("Only admins and baristas can update stock."); return; }
    setInventory((prev) => {
      const idx = prev.findIndex((i) => i.name.toLowerCase() === item.name.toLowerCase());
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [...prev, item];
    });
    supabase.from("inventory").upsert({ name: item.name, available: item.available, status: item.status, image: item.image || "" }, { onConflict: "name" })
      .then(({ error }) => { if (error) console.error("Supabase addStock error:", error); });
  }, []);

  const deleteStock = useCallback((name: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can delete stock."); return; }
    const target = inventoryRef.current.find((i) => i.name.toLowerCase() === name.toLowerCase());
    setInventory((prev) => prev.filter((i) => i.name.toLowerCase() !== name.toLowerCase()));
    const now = new Date().toISOString();
    supabase.from("inventory").update({ deleted_at: now, deleted_by: displayNameRef.current }).eq("name", name)
      .then(({ error }) => { if (error) console.error("Supabase softDelete inventory error:", error); });
    if (target) {
      supabase.from("deletion_audit").insert({ table_name: "inventory", record_id: target.name, record_name: target.name, deleted_by: displayNameRef.current, deleted_at: now, snapshot: target })
        .then(({ error }) => { if (error) console.error("Supabase audit log error:", error); });
    }
  }, []);

  const notify = useCallback((message: string) => {
    const notif: Notification = { id: Math.random().toString(36).slice(2), message, time: Date.now() };
    setNotifications((n) => [notif, ...n].slice(0, NOTIF_LIMIT));
    supabase.from("notifications").insert({ id: notif.id, message: notif.message, time: notif.time })
      .then(({ error }) => { if (error) console.error("Supabase notify error:", error); });
  }, []);

  const clearNotifications = useCallback(() => {
    if (!isAdminRef.current) { toast.error("Only admins can clear notifications."); return; }
    setNotifications([]);
    supabase.from("notifications").delete().neq("id", "")
      .then(({ error }) => { if (error) console.error("Supabase clearNotifications error:", error); });
  }, []);

  const isNotificationRead = useCallback((id: string) => readIds.has(id), [readIds]);

  const markNotificationRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      if (userRef.current?.id) saveReadIds(userRef.current.id, next);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notificationsRef.current) next.add(n.id);
      if (userRef.current?.id) saveReadIds(userRef.current.id, next);
      return next;
    });
  }, []);

  const addTransaction = useCallback(
    (
      items: CartItem[],
      subtotal: number,
      discount: number,
      tax: number,
      total: number,
      payment: string,
      meta?: { seniorDiscount?: boolean; discountPercent?: number },
    ) => {
      const txId = "TX-" + Math.floor(1000 + Math.random() * 9000);
      const newTx: Transaction = {
        id: txId,
        items,
        subtotal,
        discount,
        tax,
        total,
        payment,
        time: Date.now(),
        status: "completed",
        seniorDiscount: meta?.seniorDiscount,
        discountPercent: meta?.discountPercent,
      };
      setTransactions((prev) => [newTx, ...prev].slice(0, TX_PAGE_SIZE));
      supabase
        .from("transactions")
        .insert({
          id: txId,
          items,
          subtotal,
          discount,
          tax,
          total,
          payment,
          time: newTx.time,
          status: "completed",
          senior_discount: meta?.seniorDiscount ?? false,
          discount_percent: meta?.discountPercent ?? null,
        })
        .then(({ error }) => { if (error) console.error("Supabase addTransaction error:", error); });
      return newTx;
    },
    [],
  );

  const updateSeniorDiscountPercent = useCallback(async (percent: number) => {
    if (!isAdminRef.current) { toast.error("Only admins can change settings."); return; }
    const pct = Math.min(100, Math.max(0, Number(percent) || 0));
    setSeniorDiscountPercent(pct);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "senior_discount_percent", value: pct, updated_at: new Date().toISOString() });
    if (error) { console.error(error); toast.error(error.message || "Failed to save setting."); }
    else toast.success(`Senior discount set to ${pct}%`);
  }, []);

  const voidTransaction = useCallback((id: string) => {
    if (!isAdminRef.current) { toast.error("Only admins can void transactions."); return; }
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, status: "voided" as const } : t)));
    supabase.from("transactions").update({ status: "voided" }).eq("id", id)
      .then(({ error }) => { if (error) console.error("Supabase voidTransaction error:", error); });
  }, []);

  const value = useMemo<Store>(
    () => ({
      products, menuCategories, categoryVariants, syrups, inventory, cart,
      notifications, unreadCount, transactions, loading, seniorDiscountPercent, isAdmin, role, displayName,
      addToCart, removeFromCart, changeQty, clearCart,
      addProduct, deleteProduct, updateProduct,
      addCategory, updateCategory, deleteCategory,
      addVariant, updateVariant, deleteVariant,
      addSyrup, updateSyrup, deleteSyrup,
      addStock, deleteStock, notify, clearNotifications,
      isNotificationRead, markNotificationRead, markAllNotificationsRead,
      addTransaction, voidTransaction, updateSeniorDiscountPercent,
    }),
    [
      products, menuCategories, categoryVariants, syrups, inventory, cart,
      notifications, unreadCount, transactions, loading, seniorDiscountPercent, isAdmin, role, displayName,
      addToCart, removeFromCart, changeQty, clearCart,
      addProduct, deleteProduct, updateProduct,
      addCategory, updateCategory, deleteCategory,
      addVariant, updateVariant, deleteVariant,
      addSyrup, updateSyrup, deleteSyrup,
      addStock, deleteStock, notify, clearNotifications,
      isNotificationRead, markNotificationRead, markAllNotificationsRead,
      addTransaction, voidTransaction, updateSeniorDiscountPercent,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
