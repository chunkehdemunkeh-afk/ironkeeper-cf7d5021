// Open Food Facts API client (via edge function proxy)

export interface FoodItem {
  barcode?: string;
  name: string;
  brand?: string;
  servingSize?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    "energy-kcal_serving"?: number;
    proteins_serving?: number;
    carbohydrates_serving?: number;
    fat_serving?: number;
  };
  image_front_small_url?: string;
}

function parseProduct(p: OFFProduct): FoodItem | null {
  if (!p.product_name) return null;
  const n = p.nutriments;
  return {
    barcode: p.code,
    name: p.product_name,
    brand: p.brands,
    servingSize: p.serving_size || "100g",
    calories: Math.round(n?.["energy-kcal_100g"] ?? 0),
    protein: Math.round((n?.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((n?.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((n?.fat_100g ?? 0) * 10) / 10,
    imageUrl: p.image_front_small_url,
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class ServiceUnavailableError extends Error {
  constructor() { super("Food database is temporarily unavailable. Please try again shortly."); }
}

export async function searchFoods(query: string, page = 1): Promise<FoodItem[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?q=${encodeURIComponent(query)}&page=${page}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.fallback) throw new ServiceUnavailableError();
    return (data.products as OFFProduct[])
      .map(parseProduct)
      .filter((p): p is FoodItem => p !== null && p.calories > 0);
  } catch (e) {
    if (e instanceof ServiceUnavailableError) throw e;
    return [];
  }
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?barcode=${encodeURIComponent(barcode)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return parseProduct(data.product as OFFProduct);
  } catch {
    return null;
  }
}
