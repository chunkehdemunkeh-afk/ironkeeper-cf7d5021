import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, X, Lightbulb, Scale, Utensils, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";
import CompleteDaySummary from "@/components/food/CompleteDaySummary";

interface DayStatus {
  weightLogged: boolean;
  foodLogged: boolean;
  waterLogged: boolean;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  waterMl: number;
  waterGoalMl: number;
}

export default function HomeCompleteDay() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [status, setStatus] = useState<DayStatus | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from("body_measurements")
        .select("id")
        .eq("user_id", user.id)
        .gte("date", today + "T00:00:00")
        .lte("date", today + "T23:59:59")
        .limit(1),
      supabase
        .from("food_logs")
        .select("calories, protein_g, carbs_g, fat_g")
        .eq("user_id", user.id)
        .eq("date", today),
      supabase
        .from("water_intake")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", today),
      supabase
        .from("nutrition_goals")
        .select("calories, protein_g, carbs_g, fat_g, water_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]).then(([weightRes, foodRes, waterRes, goalsRes]) => {
      const foods = foodRes.data || [];
      const totals = foods.reduce(
        (a: any, l: any) => ({
          calories: a.calories + l.calories,
          protein: a.protein + l.protein_g,
          carbs: a.carbs + l.carbs_g,
          fat: a.fat + l.fat_g,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      const waterEntries = waterRes.data || [];
      const waterMl = waterEntries.reduce((s: number, e: any) => s + e.amount_ml, 0);
      const goals = goalsRes.data as any;

      setStatus({
        weightLogged: (weightRes.data || []).length > 0,
        foodLogged: foods.length > 0,
        waterLogged: waterMl > 0,
        totals,
        goals: goals ? { calories: goals.calories, protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g } : null,
        waterMl,
        waterGoalMl: goals?.water_goal_ml || 2500,
      });
    });
  }, [user, today]);

  if (!user || !status) return null;

  const missingItems: { icon: typeof Scale; label: string }[] = [];
  if (!status.weightLogged) missingItems.push({ icon: Scale, label: "Body weight" });
  if (!status.foodLogged) missingItems.push({ icon: Utensils, label: "Nutrition" });
  if (!status.waterLogged) missingItems.push({ icon: Droplet, label: "Water intake" });

  const handleComplete = () => {
    if (missingItems.length > 0) {
      setShowWarning(true);
    } else {
      openSummary();
    }
  };

  const openSummary = () => {
    setShowWarning(false);
    if (status.goals) {
      setShowSummary(true);
    } else {
      toast.success("Day completed! 🎉");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Button
          onClick={handleComplete}
          className="w-full rounded-xl gradient-primary py-6 text-sm font-bold text-primary-foreground glow-primary"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Day
        </Button>
      </motion.div>

      {/* Missing items warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowWarning(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-5 pb-8"
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />

              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold font-display">Before you finish...</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                You haven't logged the following today:
              </p>

              <div className="space-y-2 mb-5">
                {missingItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                    <Icon className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-foreground">{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowWarning(false)}
                  className="flex-1"
                >
                  Go back & log
                </Button>
                <Button
                  onClick={openSummary}
                  className="flex-1"
                >
                  Complete anyway
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full summary */}
      {status.goals && (
        <CompleteDaySummary
          open={showSummary}
          onClose={() => setShowSummary(false)}
          totals={status.totals}
          goals={status.goals}
          waterMl={status.waterMl}
          waterGoalMl={status.waterGoalMl}
        />
      )}
    </>
  );
}
