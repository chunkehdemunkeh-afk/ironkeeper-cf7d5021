// Food search client – FatSecret primary, Open Food Facts fallback

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

export class ServiceUnavailableError extends Error {
  constructor() { super("Food database is temporarily unavailable. Please try again shortly."); }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ---------- FatSecret helpers ----------

function parseFatSecretDescription(desc: string): { calories: number; fat: number; carbs: number; protein: number; servingSize: string } {
  // Format: "Per 100g - Calories: 110kcal | Fat: 1.24g | Carbs: 0.00g | Protein: 23.09g"
  const servingMatch = desc.match(/^Per\s+(.+?)\s*-/);
  const calMatch = desc.match(/Calories:\s*([\d.]+)/);
  const fatMatch = desc.match(/Fat:\s*([\d.]+)/);
  const carbMatch = desc.match(/Carbs:\s*([\d.]+)/);
  const protMatch = desc.match(/Protein:\s*([\d.]+)/);

  return {
    servingSize: servingMatch?.[1] || "1 serving",
    calories: Math.round(parseFloat(calMatch?.[1] || "0")),
    fat: Math.round(parseFloat(fatMatch?.[1] || "0") * 10) / 10,
    carbs: Math.round(parseFloat(carbMatch?.[1] || "0") * 10) / 10,
    protein: Math.round(parseFloat(protMatch?.[1] || "0") * 10) / 10,
  };
}

interface FatSecretFood {
  food_id: string;
  food_name: string;
  brand_name?: string;
  food_description: string;
  food_type: string;
}

function parseFatSecretFood(f: FatSecretFood): FoodItem {
  const parsed = parseFatSecretDescription(f.food_description);
  return {
    name: f.food_name,
    brand: f.brand_name,
    servingSize: parsed.servingSize,
    calories: parsed.calories,
    protein: parsed.protein,
    carbs: parsed.carbs,
    fat: parsed.fat,
  };
}

// ---------- Open Food Facts helpers (fallback) ----------

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
  };
  image_front_small_url?: string;
}

function parseOFFProduct(p: OFFProduct): FoodItem | null {
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

// ---------- Public API ----------

export async function searchFoods(query: string, page = 1): Promise<FoodItem[]> {
  if (!query.trim()) return [];

  // Try FatSecret first
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/fatsecret-search?q=${encodeURIComponent(query)}&page=${Math.max(0, page - 1)}&region=GB&language=en`
    );
    if (res.ok) {
      const data = await res.json();
      const foodList = data?.foods?.food;
      if (Array.isArray(foodList) && foodList.length > 0) {
        return foodList.map(parseFatSecretFood).filter((f) => f.calories > 0);
      }
    }
  } catch (e) {
    console.warn("FatSecret search failed, falling back to Open Food Facts:", e);
  }

  // Fallback to Open Food Facts
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?q=${encodeURIComponent(query)}&page=${page}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.fallback) throw new ServiceUnavailableError();
    return (data.products as OFFProduct[])
      .map(parseOFFProduct)
      .filter((p): p is FoodItem => p !== null && p.calories > 0);
  } catch (e) {
    if (e instanceof ServiceUnavailableError) throw e;
    return [];
  }
}

export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  if (!barcode.trim()) return null;

  // Try FatSecret barcode lookup first
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/fatsecret-search?barcode=${encodeURIComponent(barcode)}`
    );
    if (res.ok) {
      const data = await res.json();
      const food = data?.food;
      if (food) {
        // food.get.v4 returns detailed servings
        const servings = food.servings?.serving;
        const s = Array.isArray(servings) ? servings[0] : servings;
        if (s) {
          return {
            barcode,
            name: food.food_name,
            brand: food.brand_name,
            servingSize: s.serving_description || s.metric_serving_unit || "1 serving",
            calories: Math.round(parseFloat(s.calories || "0")),
            protein: Math.round(parseFloat(s.protein || "0") * 10) / 10,
            carbs: Math.round(parseFloat(s.carbohydrate || "0") * 10) / 10,
            fat: Math.round(parseFloat(s.fat || "0") * 10) / 10,
          };
        }
      }
    }
  } catch (e) {
    console.warn("FatSecret barcode lookup failed, falling back:", e);
  }

  // Fallback to Open Food Facts
  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/food-search?barcode=${encodeURIComponent(barcode)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return parseOFFProduct(data.product as OFFProduct);
  } catch {
    return null;
  }
}
