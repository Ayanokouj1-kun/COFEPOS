export const CATEGORIES = ["Hot", "Cold", "Waffles", "Flavors"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Cup sizes by drink temperature — only Hot / Cold use these at checkout */
export const SIZE_OPTIONS = {
  Hot: ["8oz", "12oz", "16oz"],
  Cold: ["12oz", "16oz"],
} as const;

export type HotColdCategory = keyof typeof SIZE_OPTIONS;

export function categoryNeedsSize(category: string): category is HotColdCategory {
  return category === "Hot" || category === "Cold";
}

export function getSizesForCategory(category: string): readonly string[] {
  if (categoryNeedsSize(category)) return SIZE_OPTIONS[category];
  return [];
}

export type SizePrices = Record<string, number>;

/**
 * Default size prices from a base (12oz for Hot/Cold).
 * Hot: 8oz cheaper, 16oz higher. Cold: 16oz higher than 12oz.
 */
export function defaultSizePrices(basePrice: number, category: string): SizePrices {
  const base = Number(basePrice) || 0;
  if (category === "Hot") {
    return {
      "8oz": Math.round(base * 0.85 * 100) / 100,
      "12oz": base,
      "16oz": Math.round(base * 1.25 * 100) / 100,
    };
  }
  if (category === "Cold") {
    return {
      "12oz": base,
      "16oz": Math.round(base * 1.25 * 100) / 100,
    };
  }
  return {};
}

/** Normalize DB / form size_prices into numbers for known sizes */
export function normalizeSizePrices(
  raw: unknown,
  basePrice: number,
  category: string,
): SizePrices | undefined {
  if (!categoryNeedsSize(category)) return undefined;

  const sizes = getSizesForCategory(category);
  const defaults = defaultSizePrices(basePrice, category);
  const out: SizePrices = { ...defaults };

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const size of sizes) {
      const v = (raw as Record<string, unknown>)[size];
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(n) && n >= 0) out[size] = n;
    }
  }

  return out;
}

/** Resolve sell price for a size (falls back to base product price) */
export function getPriceForSize(
  product: { price: number; sizePrices?: SizePrices; category?: string },
  size?: string,
): number {
  if (!size) return Number(product.price) || 0;
  const fromMap = product.sizePrices?.[size];
  if (typeof fromMap === "number" && !Number.isNaN(fromMap)) return fromMap;
  if (product.category) {
    const defaults = defaultSizePrices(product.price, product.category);
    if (defaults[size] != null) return defaults[size];
  }
  return Number(product.price) || 0;
}

/** Display "₱80 – ₱100" or single price when no sizes */
export function formatPriceRange(
  product: { price: number; sizePrices?: SizePrices; category?: string },
): string {
  const cat = product.category || "";
  if (!categoryNeedsSize(cat)) {
    return `₱${(Number(product.price) || 0).toFixed(2)}`;
  }
  const sizes = getSizesForCategory(cat);
  const prices = sizes.map((s) => getPriceForSize(product, s));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `₱${min.toFixed(2)}`;
  return `₱${min.toFixed(0)} – ₱${max.toFixed(0)}`;
}

/** Map legacy category names → current ones (pre–menu restructure data) */
const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  Coffee: "Hot",
  Pastries: "Waffles",
  "Syrups & Retail": "Flavors",
  "Drinks & Others": "Cold",
  // Older / alternate labels
  Syrups: "Flavors",
  Flavour: "Flavors",
  Flavor: "Flavors",
  Waffle: "Waffles",
};

/**
 * Automatically determine category based on keywords in the product name.
 * Used as a fallback when a product has no explicit category stored.
 */
export function getAutomaticCategory(name: string): Category {
  const n = name.toLowerCase();

  if (n.includes("waffle") || n.includes("croffle")) {
    return "Waffles";
  }

  if (
    n.includes("syrup") ||
    n.includes("flavor") ||
    n.includes("flavour") ||
    n.includes("vanilla") ||
    n.includes("caramel") ||
    n.includes("hazelnut") ||
    n.includes("lavender") ||
    n.includes("mocha syrup") ||
    n.includes("sauce")
  ) {
    return "Flavors";
  }

  if (
    n.includes("iced") ||
    n.includes("cold") ||
    n.includes("frappe") ||
    n.includes("frappé") ||
    n.includes("shake") ||
    n.includes("refresher") ||
    n.includes("lemonade") ||
    n.includes("matcha latte iced")
  ) {
    return "Cold";
  }

  if (
    n.includes("latte") ||
    n.includes("coffee") ||
    n.includes("espresso") ||
    n.includes("americano") ||
    n.includes("cappuccino") ||
    n.includes("macchiato") ||
    n.includes("mocha") ||
    n.includes("flat white") ||
    n.includes("hot chocolate") ||
    n.includes("matcha")
  ) {
    return "Hot";
  }

  return "Hot";
}

/**
 * Resolves a product's category from its stored category field,
 * remapping legacy values and falling back to keyword detection.
 */
export function getProductCategory(
  storedCategory: string | null | undefined,
  productName: string,
): Category {
  if (storedCategory) {
    if ((CATEGORIES as readonly string[]).includes(storedCategory)) {
      return storedCategory as Category;
    }
    const mapped = LEGACY_CATEGORY_MAP[storedCategory];
    if (mapped) return mapped;
  }
  return getAutomaticCategory(productName);
}
