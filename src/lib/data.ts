// Gracefully load all local asset images.
// If a file has been deleted, the glob simply returns an empty record — no compile errors.
const imageAssets = import.meta.glob("../assets/*.{jpg,jpeg,png,webp,gif}", {
  eager: true,
}) as Record<string, { default: string }>;

/**
 * Inline SVG placeholder shown whenever a product has no local image file.
 * A minimal coffee-cup icon — no external URL required.
 */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f5f0eb'/%3E%3Ctext x='50' y='58' font-size='42' text-anchor='middle' dominant-baseline='middle'%3E%E2%98%95%3C/text%3E%3C/svg%3E";

export const products: Array<{
  id: string;
  name: string;
  price: number;
  cost: number;
  image: string;
  category: string;
}> = [];

export const inventory: Array<{
  name: string;
  available: string;
  status: "in" | "low";
}> = [];
