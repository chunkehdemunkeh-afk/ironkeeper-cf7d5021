// Open Food Facts API client

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

export async function searchFoods(query: string, page = 1): Promise<FoodItem[]> {
  if (!query.trim()) return [];
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&page=${page}&fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products as OFFProduct[])
    .map(parseProduct)
    .filter((p): p is FoodItem => p !== null && p.calories > 0);
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,serving_size,nutriments,image_front_small_url`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return parseProduct(data.product as OFFProduct);
}
