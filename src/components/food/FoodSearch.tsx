import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, X, Clock, RotateCcw, PenLine, ScanBarcode, Star } from "lucide-react";
import { searchFoods, FoodItem } from "@/lib/open-food-facts";
import ManualFoodEntry from "./ManualFoodEntry";
import BarcodeScanner from "./BarcodeScanner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface SavedFood {
  food_name: string;
  brand: string | null;
  serving_size: string | null;
  serving_qty: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  barcode: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mealType: MealType;
  date: string;
  onLogged: () => void;
}

export default function FoodSearch({ open, onClose, mealType, date, onLogged }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const [recents, setRecents] = useState<SavedFood[]>([]);
  const [favourites, setFavourites] = useState<SavedFood[]>([]);
  const [favouriteNames, setFavouriteNames] = useState<Set<string>>(new Set());
  const [quickAdding, setQuickAdding] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "manual" | "scan">("search");

  // Fetch recents + favourites on open
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [logsRes, favsRes] = await Promise.all([
        supabase
          .from("food_logs")
          .select("food_name, brand, serving_size, serving_qty, calories, protein_g, carbs_g, fat_g, barcode, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("favourite_foods")
          .select("food_name, brand, serving_size, serving_qty, calories, protein_g, carbs_g, fat_g, barcode")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      // Recents
      if (logsRes.data) {
        const seen = new Set<string>();
        const unique: SavedFood[] = [];
        for (const row of logsRes.data) {
          const key = row.food_name.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(row as SavedFood);
          }
          if (unique.length >= 10) break;
        }
        setRecents(unique);
      }

      // Favourites
      if (favsRes.data) {
        setFavourites(favsRes.data as SavedFood[]);
        setFavouriteNames(new Set(favsRes.data.map((f) => f.food_name.toLowerCase())));
      }
    })();
  }, [open, user]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    const items = await searchFoods(query);
    setResults(items);
    setSearching(false);
  }, [query]);

  const handleLog = async () => {
    if (!user || !selected) return;
    setSaving(true);
    const qty = Math.max(0.1, parseFloat(servings) || 1);
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date,
      meal_type: mealType,
      food_name: selected.name,
      brand: selected.brand || null,
      serving_size: selected.servingSize || "100g",
      serving_qty: qty,
      calories: Math.round(selected.calories * qty),
      protein_g: Math.round(selected.protein * qty * 10) / 10,
      carbs_g: Math.round(selected.carbs * qty * 10) / 10,
      fat_g: Math.round(selected.fat * qty * 10) / 10,
      barcode: selected.barcode || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to log food");
      return;
    }
    toast.success(`${selected.name} logged to ${mealType}`);
    setSelected(null);
    setQuery("");
    setResults([]);
    onLogged();
    onClose();
  };

  const quickAdd = async (food: SavedFood) => {
    if (!user) return;
    setQuickAdding(food.food_name);
    const { error } = await supabase.from("food_logs").insert({
      user_id: user.id,
      date,
      meal_type: mealType,
      food_name: food.food_name,
      brand: food.brand,
      serving_size: food.serving_size,
      serving_qty: food.serving_qty,
      calories: food.calories,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      barcode: food.barcode,
    });
    setQuickAdding(null);
    if (error) {
      toast.error("Failed to log food");
      return;
    }
    toast.success(`${food.food_name} logged to ${mealType}`);
    onLogged();
    onClose();
  };

  const toggleFavourite = async (food: { name: string; brand?: string | null; servingSize?: string | null; calories: number; protein: number; carbs: number; fat: number; barcode?: string | null }) => {
    if (!user) return;
    const key = food.name.toLowerCase();
    if (favouriteNames.has(key)) {
      // Remove
      await supabase.from("favourite_foods").delete().eq("user_id", user.id).eq("food_name", food.name);
      setFavouriteNames((prev) => { const next = new Set(prev); next.delete(key); return next; });
      setFavourites((prev) => prev.filter((f) => f.food_name.toLowerCase() !== key));
      toast.success("Removed from favourites");
    } else {
      // Add
      const { error } = await supabase.from("favourite_foods").insert({
        user_id: user.id,
        food_name: food.name,
        brand: food.brand || null,
        serving_size: food.servingSize || "100g",
        serving_qty: 1,
        calories: Math.round(food.calories),
        protein_g: Math.round(food.protein * 10) / 10,
        carbs_g: Math.round(food.carbs * 10) / 10,
        fat_g: Math.round(food.fat * 10) / 10,
        barcode: food.barcode || null,
      });
      if (error) {
        toast.error("Failed to favourite");
        return;
      }
      setFavouriteNames((prev) => new Set(prev).add(key));
      setFavourites((prev) => [{ food_name: food.name, brand: food.brand || null, serving_size: food.servingSize || "100g", serving_qty: 1, calories: Math.round(food.calories), protein_g: Math.round(food.protein * 10) / 10, carbs_g: Math.round(food.carbs * 10) / 10, fat_g: Math.round(food.fat * 10) / 10, barcode: food.barcode || null }, ...prev]);
      toast.success("Added to favourites");
    }
  };

  const showQuickAccess = !selected && results.length === 0 && !query;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="capitalize text-left">Add to {mealType}</SheetTitle>
          </SheetHeader>

          {/* Mode tabs */}
          <div className="flex px-4 pb-3 gap-2">
            <button
              onClick={() => setMode("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search className="h-3.5 w-3.5" /> Search
            </button>
            <button
              onClick={() => setMode("scan")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "scan"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <ScanBarcode className="h-3.5 w-3.5" /> Scan
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                mode === "manual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3.5 w-3.5" /> Manual
            </button>
          </div>

          {mode === "scan" ? (
            <BarcodeScanner
              onFoodFound={(food) => {
                setSelected(food);
                setServings("1");
                setMode("search");
              }}
            />
          ) : mode === "manual" ? (
            <ManualFoodEntry mealType={mealType} date={date} onLogged={onLogged} onClose={onClose} />
          ) : (
            <>
              {/* Search bar */}
              <div className="px-4 pb-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); doSearch(); }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search foods..."
                      className="pl-9 h-10"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={searching} className="h-10 px-4">
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </form>
              </div>

              {selected ? (
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{selected.name}</h3>
                      {selected.brand && (
                        <p className="text-xs text-muted-foreground">{selected.brand}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavourite(selected)}
                        className="text-muted-foreground hover:text-amber-400 transition-colors"
                      >
                        <Star
                          className={`h-5 w-5 ${favouriteNames.has(selected.name.toLowerCase()) ? "fill-amber-400 text-amber-400" : ""}`}
                        />
                      </button>
                      <button onClick={() => setSelected(null)}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-secondary/50">
                    <div>
                      <div className="text-base font-bold text-primary">
                        {Math.round(selected.calories * (parseFloat(servings) || 1))}
                      </div>
                      <div className="text-[10px] text-muted-foreground">kcal</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-blue-400">
                        {(selected.protein * (parseFloat(servings) || 1)).toFixed(1)}g
                      </div>
                      <div className="text-[10px] text-muted-foreground">Protein</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-amber-400">
                        {(selected.carbs * (parseFloat(servings) || 1)).toFixed(1)}g
                      </div>
                      <div className="text-[10px] text-muted-foreground">Carbs</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-rose-400">
                        {(selected.fat * (parseFloat(servings) || 1)).toFixed(1)}g
                      </div>
                      <div className="text-[10px] text-muted-foreground">Fat</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Servings ({selected.servingSize || "100g"} per serving)
                    </Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.1"
                      value={servings}
                      onChange={(e) => setServings(e.target.value)}
                      className="mt-1 h-12 text-lg"
                    />
                  </div>

                  <Button onClick={handleLog} disabled={saving} className="w-full h-12 font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    {saving ? "Logging..." : "Log Food"}
                  </Button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                  {/* Favourites */}
                  {showQuickAccess && favourites.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">Favourites</span>
                      </div>
                      {favourites.map((food, i) => (
                        <button
                          key={`fav-${i}`}
                          onClick={() => quickAdd(food)}
                          disabled={quickAdding === food.food_name}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="h-10 w-10 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{food.food_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {food.serving_qty}× {food.serving_size || "100g"} · {Math.round(food.protein_g)}p · {Math.round(food.carbs_g)}c · {Math.round(food.fat_g)}f
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-primary">{Math.round(food.calories)}</div>
                            <div className="text-[10px] text-muted-foreground">kcal</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Recents */}
                  {showQuickAccess && recents.length > 0 && (
                    <div className="space-y-2">
                      {favourites.length > 0 && <div className="border-t border-border my-2" />}
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Recent Foods</span>
                      </div>
                      {recents.map((food, i) => (
                        <button
                          key={`recent-${i}`}
                          onClick={() => quickAdd(food)}
                          disabled={quickAdding === food.food_name}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{food.food_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {food.serving_qty}× {food.serving_size || "100g"} · {Math.round(food.protein_g)}p · {Math.round(food.carbs_g)}c · {Math.round(food.fat_g)}f
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-primary">{Math.round(food.calories)}</div>
                            <div className="text-[10px] text-muted-foreground">kcal</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showQuickAccess && (favourites.length > 0 || recents.length > 0) && (
                    <>
                      <div className="border-t border-border my-3" />
                      <p className="text-center text-xs text-muted-foreground">
                        Or search for new foods above
                      </p>
                    </>
                  )}

                  {/* Search results */}
                  {results.length === 0 && !searching && query && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No results found. Try a different search.
                    </p>
                  )}
                  {results.map((item, i) => (
                    <button
                      key={`${item.barcode}-${i}`}
                      onClick={() => { setSelected(item); setServings("1"); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground text-xs">🍽</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.brand && <p className="text-xs text-muted-foreground truncate">{item.brand}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-primary">{item.calories}</div>
                        <div className="text-[10px] text-muted-foreground">kcal/100g</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
