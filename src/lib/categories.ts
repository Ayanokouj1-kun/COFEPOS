/** Dynamic menu category system — all data loaded from Supabase */

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  supports_syrup: boolean;
  deleted_at?: string | null;
};

export type CategoryVariant = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  deleted_at?: string | null;
};

export type Syrup = {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
  sort_order: number;
  deleted_at?: string | null;
};

export type VariantPrices = Record<string, number>;
/** Per-variant cup sizes → price (e.g. coffee-hot → 8oz/12oz/16oz) */
export type SizePrices = Record<string, Record<string, number>>;

export type ProductPricing = {
  price: number;
  categoryId?: string;
  variantPrices?: VariantPrices;
  sizePrices?: SizePrices;
};

/** Cup sizes for COFFEE Hot / Iced (Cold) variants */
const COFFEE_SIZED_VARIANTS: Record<string, readonly string[]> = {
  "coffee-hot": ["8oz", "12oz", "16oz"],
  "coffee-iced": ["12oz", "16oz"],
};

export function variantNeedsSize(categoryId: string, variantId: string): boolean {
  return categoryId === "coffee" && variantId in COFFEE_SIZED_VARIANTS;
}

export function getSizesForVariant(categoryId: string, variantId: string): readonly string[] {
  if (!variantNeedsSize(categoryId, variantId)) return [];
  return COFFEE_SIZED_VARIANTS[variantId] ?? [];
}

export function defaultSizePricesForVariant(basePrice: number, variantId: string): Record<string, number> {
  const base = Number(basePrice) || 0;
  const round = (n: number) => Math.round(n * 100) / 100;
  if (variantId === "coffee-hot") {
    return { "8oz": round(base * 0.85), "12oz": base, "16oz": round(base * 1.25) };
  }
  if (variantId === "coffee-iced") {
    return { "12oz": base, "16oz": round(base * 1.25) };
  }
  return {};
}

export function normalizeSizePrices(
  raw: unknown,
  basePrice: number,
  categoryId: string,
): SizePrices | undefined {
  if (categoryId !== "coffee") return undefined;
  const out: SizePrices = {};
  for (const [variantId, sizes] of Object.entries(COFFEE_SIZED_VARIANTS)) {
    const defaults = defaultSizePricesForVariant(basePrice, variantId);
    out[variantId] = { ...defaults };
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const variantRaw = (raw as Record<string, unknown>)[variantId];
      if (variantRaw && typeof variantRaw === "object" && !Array.isArray(variantRaw)) {
        for (const size of sizes) {
          const v = (variantRaw as Record<string, unknown>)[size];
          const n = typeof v === "number" ? v : Number(v);
          if (!Number.isNaN(n) && n >= 0) out[variantId]![size] = n;
        }
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Unit sell price for a product line (variant + optional size + syrup add-on) */
export function getUnitPrice(
  product: ProductPricing,
  options?: { variantId?: string; size?: string; syrupPrice?: number },
  variants?: CategoryVariant[],
): number {
  const { variantId, size, syrupPrice = 0 } = options ?? {};
  let unit = Number(product.price) || 0;

  if (variantId && size && product.sizePrices?.[variantId]?.[size] != null) {
    unit = product.sizePrices[variantId]![size]!;
  } else if (variantId) {
    unit = getPriceForVariant(product, variantId, variants);
  }

  return unit + (Number(syrupPrice) || 0);
}

/** Active categories sorted by sort_order */
export function activeCategories(categories: MenuCategory[]): MenuCategory[] {
  return categories
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** Active variants for a category */
export function variantsForCategory(
  categoryId: string,
  variants: CategoryVariant[],
): CategoryVariant[] {
  return variants
    .filter((v) => v.category_id === categoryId && !v.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** Whether a category has configurable variants */
export function categoryHasVariants(categoryId: string, variants: CategoryVariant[]): boolean {
  return variantsForCategory(categoryId, variants).length > 0;
}

/** Resolve category name from id */
export function getCategoryName(
  categoryId: string | null | undefined,
  categories: MenuCategory[],
): string {
  if (!categoryId) return "Uncategorized";
  const cat = categories.find((c) => c.id === categoryId);
  return cat?.name ?? categoryId;
}

/** Resolve category id from stored value (id or legacy name) */
export function resolveCategoryId(
  stored: string | null | undefined,
  categories: MenuCategory[],
  productName?: string,
): string {
  if (!stored) return guessCategoryId(productName ?? "", categories);
  const byId = categories.find((c) => c.id === stored && !c.deleted_at);
  if (byId) return byId.id;
  const byName = categories.find(
    (c) => c.name.toLowerCase() === stored.toLowerCase() && !c.deleted_at,
  );
  if (byName) return byName.id;
  // Legacy category names from old system
  const legacy = legacyCategoryMap(stored, productName ?? "", categories);
  if (legacy) return legacy;
  return guessCategoryId(productName ?? "", categories);
}

function legacyCategoryMap(
  stored: string,
  name: string,
  categories: MenuCategory[],
): string | null {
  const n = name.toLowerCase();
  const find = (id: string) => categories.find((c) => c.id === id && !c.deleted_at)?.id ?? null;

  const legacy: Record<string, string> = {
    Hot: "coffee",
    Cold: "coffee",
    Coffee: "coffee",
    Waffles: "non-coffee",
    Flavors: "coffee",
    "Syrups & Retail": "coffee",
    Syrups: "coffee",
    Flavor: "coffee",
    Flavour: "coffee",
    Pastries: "non-coffee",
    "Drinks & Others": "non-coffee",
  };

  const mapped = legacy[stored];
  if (mapped) return find(mapped);

  if (n.includes("matcha")) return find("matcha");
  if (n.includes("milktea") || n.includes("milk tea") || n.includes("bubble"))
    return find("bubble-milktea");
  if (n.includes("lemonade")) return find("protein-lemonade");
  if (n.includes("frappe") || n.includes("frappé")) return find("thick-frappe");
  if (n.includes("ice tea") || n.includes("iced tea")) return find("traditional-ice-tea");
  if (n.includes("ice coffee") || n.includes("iced coffee")) return find("ice-coffee");

  return null;
}

/** Keyword-based fallback when no category is stored */
export function guessCategoryId(name: string, categories: MenuCategory[]): string {
  const n = name.toLowerCase();
  const find = (id: string) => categories.find((c) => c.id === id && !c.deleted_at)?.id;

  if (n.includes("matcha")) return find("matcha") ?? categories[0]?.id ?? "coffee";
  if (n.includes("milktea") || n.includes("milk tea") || n.includes("bubble"))
    return find("bubble-milktea") ?? categories[0]?.id ?? "coffee";
  if (n.includes("lemonade")) return find("protein-lemonade") ?? categories[0]?.id ?? "coffee";
  if (n.includes("frappe") || n.includes("frappé"))
    return find("thick-frappe") ?? categories[0]?.id ?? "coffee";
  if (n.includes("ice tea") || n.includes("iced tea"))
    return find("traditional-ice-tea") ?? categories[0]?.id ?? "coffee";
  if (n.includes("ice coffee") || n.includes("iced coffee"))
    return find("ice-coffee") ?? categories[0]?.id ?? "coffee";
  if (n.includes("blended") && !n.includes("bubble"))
    return find("fresh-blended") ?? categories[0]?.id ?? "coffee";
  if (
    n.includes("chocolate") ||
    n.includes("tea") && !n.includes("coffee") ||
    n.includes("waffle")
  )
    return find("non-coffee") ?? categories[0]?.id ?? "coffee";
  if (n.includes("coffee") || n.includes("latte") || n.includes("espresso") || n.includes("mocha"))
    return find("coffee") ?? categories[0]?.id ?? "coffee";

  return categories[0]?.id ?? "coffee";
}

/** Default variant prices — all variants get the base price */
export function defaultVariantPrices(
  basePrice: number,
  categoryId: string,
  variants: CategoryVariant[],
): VariantPrices {
  const base = Number(basePrice) || 0;
  const out: VariantPrices = {};
  for (const v of variantsForCategory(categoryId, variants)) {
    if (variantNeedsSize(categoryId, v.id)) continue;
    out[v.id] = base;
  }
  return out;
}

/** Normalize DB/form variant_prices */
export function normalizeVariantPrices(
  raw: unknown,
  basePrice: number,
  categoryId: string,
  variants: CategoryVariant[],
): VariantPrices | undefined {
  if (!categoryHasVariants(categoryId, variants)) return undefined;

  const defaults = defaultVariantPrices(basePrice, categoryId, variants);
  const out: VariantPrices = { ...defaults };

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const v of variantsForCategory(categoryId, variants)) {
      if (variantNeedsSize(categoryId, v.id)) continue;
      const val = (raw as Record<string, unknown>)[v.id];
      const n = typeof val === "number" ? val : Number(val);
      if (!Number.isNaN(n) && n >= 0) out[v.id] = n;
    }
  }

  return out;
}

/** Resolve sell price for a variant */
export function getPriceForVariant(
  product: ProductPricing,
  variantId?: string,
  variants?: CategoryVariant[],
): number {
  if (!variantId) return Number(product.price) || 0;
  const fromMap = product.variantPrices?.[variantId];
  if (typeof fromMap === "number" && !Number.isNaN(fromMap)) return fromMap;
  if (product.categoryId && variants) {
    const defaults = defaultVariantPrices(product.price, product.categoryId, variants);
    if (defaults[variantId] != null) return defaults[variantId];
  }
  return Number(product.price) || 0;
}

/** Display price range or single price */
export function formatPriceRange(
  product: ProductPricing,
  categoryId: string,
  variants: CategoryVariant[],
): string {
  const prices: number[] = [];

  if (product.sizePrices && categoryId === "coffee") {
    for (const map of Object.values(product.sizePrices)) {
      for (const p of Object.values(map)) prices.push(p);
    }
  }

  if (categoryHasVariants(categoryId, variants)) {
    for (const v of variantsForCategory(categoryId, variants)) {
      if (variantNeedsSize(categoryId, v.id)) continue;
      prices.push(getPriceForVariant(product, v.id, variants));
    }
  }

  if (prices.length === 0) {
    return `₱${(Number(product.price) || 0).toFixed(2)}`;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `₱${min.toFixed(2)}`;
  return `₱${min.toFixed(0)} – ₱${max.toFixed(0)}`;
}

/** Active enabled syrups */
export function activeSyrups(syrups: Syrup[]): Syrup[] {
  return syrups
    .filter((s) => s.enabled && !s.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** Slug helper for new records */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
