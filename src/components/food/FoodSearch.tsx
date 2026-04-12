import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, X } from "lucide-react";
import { searchFoods, FoodItem } from "@/lib/open-food-facts";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="capitalize text-left">Add to {mealType}</SheetTitle>
          </SheetHeader>

          {/* Search */}
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

          {/* Selected item detail */}
          {selected ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{selected.name}</h3>
                  {selected.brand && (
                    <p className="text-xs text-muted-foreground">{selected.brand}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
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
            /* Results list */
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
