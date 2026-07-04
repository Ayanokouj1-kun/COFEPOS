export const CATEGORIES = ["Coffee", "Pastries", "Syrups & Retail", "Drinks & Others"] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Automatically determine category based on keywords in the product name.
 * Used as a fallback when a product has no explicit category stored.
 */
export function getAutomaticCategory(name: string): Category {
  const n = name.toLowerCase();
  if (
    n.includes("latte") ||
    n.includes("coffee") ||
    n.includes("espresso") ||
    n.includes("americano") ||
    n.includes("cappuccino") ||
    n.includes("macchiato") ||
    n.includes("mocha")
  ) {
    return "Coffee";
  }
  if (
    n.includes("croissant") ||
    n.includes("pastry") ||
    n.includes("muffin") ||
    n.includes("croffle") ||
    n.includes("bun") ||
    n.includes("bread") ||
    n.includes("cookie") ||
    n.includes("cake")
  ) {
    return "Pastries";
  }
  if (n.includes("syrup") || n.includes("sauce") || n.includes("retail") || n.includes("beans")) {
    return "Syrups & Retail";
  }
  return "Drinks & Others";
}

/**
 * Resolves a product's category from its stored category field,
 * falling back to automatic keyword detection when absent.
 */
export function getProductCategory(
  storedCategory: string | null | undefined,
  productName: string,
): Category {
  if (storedCategory && (CATEGORIES as readonly string[]).includes(storedCategory)) {
    return storedCategory as Category;
  }
  return getAutomaticCategory(productName);
}
