import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings, Trash2, Flame, Beef, Wheat, Droplets, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import FoodSearch from "@/components/food/FoodSearch";
import TDEESetup from "@/components/food/TDEESetup";
import NutritionSettings from "@/components/food/NutritionSettings";
import WaterIntake from "@/components/food/WaterIntake";
import CompleteDaySummary from "@/components/food/CompleteDaySummary";
import WeeklyNutritionChart from "@/components/food/WeeklyNutritionChart";
import CopyMeal from "@/components/food/CopyMeal";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface FoodLog {
  id: string;
  meal_type: string;
  food_name: string;
  brand: string | null;
  serving_qty: number;
  serving_size: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  barcode?: string | null;
}

interface EditingLog {
  id: string;
  mealType: MealType;
  log: FoodLog;
}

interface Goals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Breakfast", icon: "🌅" },
  { type: "lunch", label: "Lunch", icon: "☀️" },
  { type: "dinner", label: "Dinner", icon: "🌙" },
  { type: "snack", label: "Snacks", icon: "🍎" },
];

export default function FoodTracker() {
  const { user } = useAuth();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [editingLog, setEditingLog] = useState<EditingLog | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [copyMeal, setCopyMeal] = useState<MealType | null>(null);
  const [waterMl, setWaterMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2500);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [logsRes, goalsRes, waterRes] = await Promise.all([
      supabase
        .from("food_logs")
        .select("id, meal_type, food_name, brand, serving_qty, serving_size, calories, protein_g, carbs_g, fat_g, barcode")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("created_at"),
      supabase
        .from("nutrition_goals")
        .select("calories, protein_g, carbs_g, fat_g, water_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", date),
    ]);
    setLogs((logsRes.data as FoodLog[]) || []);
    if (goalsRes.data) {
      setGoals(goalsRes.data as Goals);
      if ((goalsRes.data as any).water_goal_ml) setWaterGoalMl((goalsRes.data as any).water_goal_ml);
    } else {
      setGoals(null);
      setShowSetup(true);
    }
    const water = waterRes.data || [];
    setWaterMl(water.reduce((s: number, e: any) => s + e.amount_ml, 0));
    setLoading(false);
  }, [user, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for TDEE re-open from settings
  useEffect(() => {
    const handler = () => setShowSetup(true);
    window.addEventListener("open-tdee-setup", handler);
    return () => window.removeEventListener("open-tdee-setup", handler);
  }, []);

  const deleteLog = async (id: string) => {
    await supabase.from("food_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    toast.success("Removed");
  };

  // Totals
  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein_g,
      carbs: acc.carbs + l.carbs_g,
      fat: acc.fat + l.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (showSetup) {
    return (
      <TDEESetup
        onComplete={() => {
          setShowSetup(false);
          fetchData();
        }}
      />
    );
  }

  const pct = (val: number, target: number) => Math.min(100, Math.round((val / target) * 100));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">Nutrition</h1>
        <div className="flex items-center gap-1">
          {goals && logs.length > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary" onClick={() => setShowComplete(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete Day
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Date nav — up to 7 days back, not beyond today */}
      {(() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const minDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
        const isToday = date === todayStr;
        const canGoBack = date > minDate;
        return (
          <div className="flex items-center justify-center gap-4 px-4 py-2">
            <button
              onClick={() => canGoBack && setDate(format(subDays(new Date(date), 1), "yyyy-MM-dd"))}
              className={canGoBack ? "" : "opacity-30 pointer-events-none"}
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {isToday ? "Today" : format(new Date(date + "T12:00:00"), "EEE, MMM d")}
            </span>
            <button
              onClick={() => !isToday && setDate(format(addDays(new Date(date), 1), "yyyy-MM-dd"))}
              className={isToday ? "opacity-30 pointer-events-none" : ""}
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        );
      })()}

      {/* Summary */}
      {goals && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 p-4 rounded-2xl bg-card border border-border mb-4"
        >
          {/* Calorie ring */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeDasharray={`${pct(totals.calories, goals.calories)}, 100`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Flame className="h-3 w-3 text-primary" />
                <span className="text-xs font-bold">{Math.round(totals.calories)}</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-semibold text-primary">
                  {Math.max(0, goals.calories - Math.round(totals.calories))} kcal
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {Math.round(totals.calories)} / {goals.calories} kcal
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Protein", value: totals.protein, target: goals.protein_g, color: "bg-blue-400", icon: Beef },
              { label: "Carbs", value: totals.carbs, target: goals.carbs_g, color: "bg-amber-400", icon: Wheat },
              { label: "Fat", value: totals.fat, target: goals.fat_g, color: "bg-rose-400", icon: Droplets },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <m.icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${m.color} transition-all duration-500`}
                    style={{ width: `${pct(m.value, m.target)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium">
                  {Math.round(m.value)}g / {m.target}g
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly nutrition chart */}
      <WeeklyNutritionChart goals={goals} />

      {/* Water intake */}
      <div className="mt-4">
        <WaterIntake date={date} />
      </div>

      {/* Meals */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {MEALS.map((meal) => {
            const mealLogs = logs.filter((l) => l.meal_type === meal.type);
            const mealCals = mealLogs.reduce((s, l) => s + l.calories, 0);
            return (
              <div key={meal.type} className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{meal.icon}</span>
                    <span className="text-sm font-semibold">{meal.label}</span>
                    {mealCals > 0 && (
                      <span className="text-xs text-muted-foreground">{Math.round(mealCals)} kcal</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary"
                    onClick={() => setSearchMeal(meal.type)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>

                {mealLogs.length > 0 && (
                  <div className="border-t border-border">
                    {mealLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between px-3 py-2 border-b border-border/50 last:border-0 cursor-pointer active:bg-secondary/50 transition-colors"
                        onClick={() => {
                          setEditingLog({ id: log.id, mealType: meal.type, log });
                          setSearchMeal(meal.type);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{log.food_name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {log.serving_qty}× {log.serving_size || "100g"} · {Math.round(log.protein_g)}p · {Math.round(log.carbs_g)}c · {Math.round(log.fat_g)}f
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold text-primary">{Math.round(log.calories)}</span>
                          <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Food search sheet */}
      {searchMeal && (
        <FoodSearch
          open={!!searchMeal}
          onClose={() => { setSearchMeal(null); setEditingLog(null); }}
          mealType={searchMeal}
          date={date}
          onLogged={fetchData}
          editingLog={editingLog ? {
            id: editingLog.log.id,
            food_name: editingLog.log.food_name,
            brand: editingLog.log.brand,
            serving_size: editingLog.log.serving_size,
            serving_qty: editingLog.log.serving_qty,
            calories: editingLog.log.calories,
            protein_g: editingLog.log.protein_g,
            carbs_g: editingLog.log.carbs_g,
            fat_g: editingLog.log.fat_g,
            barcode: editingLog.log.barcode || null,
          } : null}
        />
      )}

      {/* Nutrition settings sheet */}
      <NutritionSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={fetchData}
      />

      {/* Complete day summary */}
      {goals && (
        <CompleteDaySummary
          open={showComplete}
          onClose={() => setShowComplete(false)}
          totals={totals}
          goals={goals}
          waterMl={waterMl}
          waterGoalMl={waterGoalMl}
        />
      )}
    </div>
  );
}
