import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Check, Flame, Beef, Wheat, Droplets } from "lucide-react";
import {
  Gender, ActivityLevel, GoalType,
  ACTIVITY_LABELS, GOAL_LABELS, calculateTDEE,
} from "@/lib/tdee-calculator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}


const GOAL_DESCRIPTIONS: Record<GoalType, string> = {
  lose: "Calorie deficit to lose body fat",
  maintain: "Stay at your current weight",
  gain: "Calorie surplus for muscle growth",
};

export default function TDEESetup({ onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<GoalType>("maintain");
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const canNext =
    step === 0 ? age !== "" :
    step === 1 ? heightCm !== "" && weightKg !== "" :
    true;

  const isLastStep = step === totalSteps - 1;

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const result = calculateTDEE(gender, +age, +heightCm, +weightKg, activity, goal);
    const { error } = await supabase.from("nutrition_goals").upsert({
      user_id: user.id,
      calories: result.targetCalories,
      protein_g: result.proteinG,
      carbs_g: result.carbsG,
      fat_g: result.fatG,
      tdee_age: +age,
      tdee_height_cm: +heightCm,
      tdee_weight_kg: +weightKg,
      tdee_activity_level: activity,
      tdee_goal: goal,
      tdee_gender: gender,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save goals");
      return;
    }
    toast.success("Nutrition goals saved!");
    onComplete();
  };

  const preview = canNext && isLastStep
    ? calculateTDEE(gender, +age || 25, +heightCm || 175, +weightKg || 75, activity, goal)
    : null;

  const goBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const goNext = () => {
    if (canNext && !isLastStep) setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <button
          onClick={goBack}
          className={`flex items-center gap-1.5 text-sm text-muted-foreground transition-opacity ${step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {/* Step dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="w-10" /> {/* spacer for alignment */}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="gender-age"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4 pb-2"
            >
              <h1 className="font-display text-3xl font-bold text-foreground">Let's calculate your goals</h1>
              <p className="text-muted-foreground mt-2 text-sm">We'll use the Mifflin-St Jeor formula to find your ideal intake.</p>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Gender</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["male", "female"] as Gender[]).map((g) => (
                      <motion.button
                        key={g}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setGender(g)}
                        className={`relative rounded-2xl p-5 text-left transition-all border ${
                          gender === g
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border/50 glass-card hover:border-primary/30"
                        }`}
                      >
                        {gender === g && (
                          <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <p className="font-semibold text-foreground capitalize">{g}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Age</p>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="25"
                    className="text-lg h-14 rounded-xl bg-card border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="measurements"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4 pb-2"
            >
              <h1 className="font-display text-3xl font-bold text-foreground">Your measurements</h1>
              <p className="text-muted-foreground mt-2 text-sm">This helps us estimate your daily calorie needs accurately.</p>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Height (cm)</p>
                  <Input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="text-lg h-14 rounded-xl bg-card border-border/50 focus:border-primary/50"
                    autoFocus
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Weight (kg)</p>
                  <Input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="75"
                    className="text-lg h-14 rounded-xl bg-card border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4 pb-2 overflow-y-auto max-h-[calc(100vh-200px)]"
            >
              <h1 className="font-display text-3xl font-bold text-foreground">How active are you?</h1>
              <p className="text-muted-foreground mt-2 text-sm">This affects your total daily energy expenditure.</p>

              <div className="space-y-3 mt-6">
                {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([key, label]) => {
                  const isSelected = activity === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActivity(key)}
                      className={`w-full rounded-2xl p-4 text-left transition-all border flex items-center gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/50 glass-card hover:border-primary/30"
                      }`}
                    >
                      
                      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4 pb-2"
            >
              <h1 className="font-display text-3xl font-bold text-foreground">What's your goal?</h1>
              <p className="text-muted-foreground mt-2 text-sm">We'll adjust your calories and macros accordingly.</p>

              <div className="space-y-3 mt-6">
                {(Object.entries(GOAL_LABELS) as [GoalType, string][]).map(([key, label]) => {
                  const isSelected = goal === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setGoal(key)}
                      className={`w-full rounded-2xl p-4 text-left transition-all border ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border/50 glass-card hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          
                          <div>
                            <p className="text-sm font-semibold text-foreground">{label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{GOAL_DESCRIPTIONS[key]}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Results preview */}
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mt-6 glass-card rounded-2xl p-5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Flame className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Your Daily Targets</p>
                      <p className="text-[10px] text-muted-foreground">TDEE: {preview.tdee} kcal · Mifflin-St Jeor</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Calories", value: `${preview.targetCalories}`, unit: "kcal", icon: Flame, color: "text-primary" },
                      { label: "Protein", value: `${preview.proteinG}g`, unit: "", icon: Beef, color: "text-blue-400" },
                      { label: "Carbs", value: `${preview.carbsG}g`, unit: "", icon: Wheat, color: "text-amber-400" },
                      { label: "Fat", value: `${preview.fatG}g`, unit: "", icon: Droplets, color: "text-rose-400" },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <m.icon className={`h-4 w-4 mx-auto mb-1 ${m.color}`} />
                        <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
                        <div className="text-[10px] text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 pb-10 pt-4">
        {isLastStep ? (
          <button
            onClick={handleFinish}
            disabled={!canNext || saving}
            className={`w-full rounded-2xl py-4 text-base font-bold transition-all flex items-center justify-center gap-2 ${
              canNext && !saving
                ? "gradient-primary text-primary-foreground glow-primary active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Check className="h-5 w-5" />
            {saving ? "Saving..." : "Save & Start Tracking"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canNext}
            className={`w-full rounded-2xl py-4 text-base font-bold transition-all flex items-center justify-center gap-2 ${
              canNext
                ? "gradient-primary text-primary-foreground glow-primary active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Continue <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
