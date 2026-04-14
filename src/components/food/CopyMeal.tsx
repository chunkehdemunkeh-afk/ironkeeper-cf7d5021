import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Copy, ChevronRight, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Breakfast", icon: "🌅" },
  { type: "lunch", label: "Lunch", icon: "☀️" },
  { type: "dinner", label: "Dinner", icon: "🌙" },
  { type: "snack", label: "Snacks", icon: "🍎" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  targetDate: string;
  targetMeal: MealType;
  onCopied: () => void;
}

interface MealPreview {
  date: string;
  dateLabel: string;
  mealType: MealType;
  mealLabel: string;
  foods: { food_name: string; calories: number }[];
  totalCals: number;
}

export default function CopyMeal({ open, onClose, targetDate, targetMeal, onCopied }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [availableMeals, setAvailableMeals] = useState<MealPreview[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);

    (async () => {
      // Fetch food logs from the past 7 days (excluding target date + meal combo)
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        dates.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
      }

      const { data } = await supabase
        .from("food_logs")
        .select("date, meal_type, food_name, brand, serving_qty, serving_size, calories, protein_g, carbs_g, fat_g, barcode")
        .eq("user_id", user.id)
        .in("date", dates)
        .order("created_at");

      if (!data) {
        setAvailableMeals([]);
        setLoading(false);
        return;
      }

      // Group by date + meal_type
      const groups = new Map<string, typeof data>();
      for (const row of data) {
        const key = `${row.date}|${row.meal_type}`;
        // Skip if it's copying to same date+meal
        if (row.date === targetDate && row.meal_type === targetMeal) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const previews: MealPreview[] = [];
      for (const [key, foods] of groups) {
        const [d, mt] = key.split("|");
        const mealInfo = MEALS.find((m) => m.type === mt);
        const isToday = d === todayStr;
        previews.push({
          date: d,
          dateLabel: isToday ? "Today" : format(new Date(d + "T12:00:00"), "EEE, MMM d"),
          mealType: mt as MealType,
          mealLabel: mealInfo?.label || mt,
          foods: foods.map((f) => ({ food_name: f.food_name, calories: f.calories })),
          totalCals: foods.reduce((s, f) => s + f.calories, 0),
        });
      }

      // Sort: most recent first
      previews.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
      setAvailableMeals(previews);
      setLoading(false);
    })();
  }, [open, user, targetDate, targetMeal]);

  const handleCopy = async (meal: MealPreview) => {
    if (!user) return;
    setCopying(true);

    // Fetch full data for that date + meal
    const { data: sourceLogs } = await supabase
      .from("food_logs")
      .select("food_name, brand, serving_qty, serving_size, calories, protein_g, carbs_g, fat_g, barcode")
      .eq("user_id", user.id)
      .eq("date", meal.date)
      .eq("meal_type", meal.mealType);

    if (!sourceLogs || sourceLogs.length === 0) {
      toast.error("No foods found to copy");
      setCopying(false);
      return;
    }

    const inserts = sourceLogs.map((log) => ({
      user_id: user.id,
      date: targetDate,
      meal_type: targetMeal,
      food_name: log.food_name,
      brand: log.brand,
      serving_qty: log.serving_qty,
      serving_size: log.serving_size,
      calories: log.calories,
      protein_g: log.protein_g,
      carbs_g: log.carbs_g,
      fat_g: log.fat_g,
      barcode: log.barcode,
    }));

    const { error } = await supabase.from("food_logs").insert(inserts);
    setCopying(false);

    if (error) {
      toast.error("Failed to copy meal");
      return;
    }

    toast.success(`Copied ${sourceLogs.length} item${sourceLogs.length > 1 ? "s" : ""} to ${MEALS.find((m) => m.type === targetMeal)?.label}`);
    onCopied();
    onClose();
  };

  const targetMealLabel = MEALS.find((m) => m.type === targetMeal)?.label || targetMeal;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 pb-2">
            <SheetTitle className="text-left text-base">
              Copy meal to {targetMealLabel}
            </SheetTitle>
            <p className="text-xs text-muted-foreground text-left">
              Select a meal from the past 7 days to copy
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableMeals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No meals found in the past 7 days to copy</p>
              </div>
            ) : (
              availableMeals.map((meal, i) => (
                <button
                  key={`${meal.date}-${meal.mealType}-${i}`}
                  onClick={() => handleCopy(meal)}
                  disabled={copying}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold">{meal.mealLabel}</span>
                      <span className="text-[10px] text-muted-foreground">· {meal.dateLabel}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {meal.foods.map((f) => f.food_name).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-primary">{Math.round(meal.totalCals)}</div>
                      <div className="text-[10px] text-muted-foreground">{meal.foods.length} items</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>

          {copying && (
            <div className="p-4 border-t border-border flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Copying...
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
