import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Check, Flame, Target } from "lucide-react";
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

  const steps = [
    // Step 0: Gender & Age
    <div key="s0" className="space-y-6">
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Gender</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {(["male", "female"] as Gender[]).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`p-4 rounded-xl border text-sm font-medium capitalize transition-all ${
                gender === g
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Age</Label>
        <Input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="25"
          className="mt-2 text-lg h-12"
        />
      </div>
    </div>,

    // Step 1: Height & Weight
    <div key="s1" className="space-y-6">
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Height (cm)</Label>
        <Input
          type="number"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          placeholder="175"
          className="mt-2 text-lg h-12"
        />
      </div>
      <div>
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">Weight (kg)</Label>
        <Input
          type="number"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          placeholder="75"
          className="mt-2 text-lg h-12"
        />
      </div>
    </div>,

    // Step 2: Activity Level
    <div key="s2" className="space-y-3">
      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Activity Level</Label>
      {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setActivity(key)}
          className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${
            activity === key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>,

    // Step 3: Goal
    <div key="s3" className="space-y-3">
      <Label className="text-muted-foreground text-xs uppercase tracking-wider">Your Goal</Label>
      {(Object.entries(GOAL_LABELS) as [GoalType, string][]).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setGoal(key)}
          className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all ${
            goal === key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>,
  ];

  const canNext =
    step === 0 ? age !== "" :
    step === 1 ? heightCm !== "" && weightKg !== "" :
    true;

  const isLastStep = step === steps.length - 1;

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

  // Show result preview on last step
  const preview = canNext && isLastStep
    ? calculateTDEE(gender, +age || 25, +heightCm || 175, +weightKg || 75, activity, goal)
    : null;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold font-display">Calculate Your Goals</h2>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</p>
        </div>
        <Target className="h-5 w-5 text-primary" />
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>

      {/* Preview */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-card border border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Your Daily Targets</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{preview.targetCalories}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{preview.proteinG}g</div>
              <div className="text-[10px] text-muted-foreground">Protein</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-400">{preview.carbsG}g</div>
              <div className="text-[10px] text-muted-foreground">Carbs</div>
            </div>
            <div>
              <div className="text-lg font-bold text-rose-400">{preview.fatG}g</div>
              <div className="text-[10px] text-muted-foreground">Fat</div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            TDEE: {preview.tdee} kcal · Mifflin-St Jeor formula
          </p>
        </motion.div>
      )}

      <div className="mt-4 pb-6">
        {isLastStep ? (
          <Button
            onClick={handleFinish}
            disabled={!canNext || saving}
            className="w-full h-12 text-base font-semibold"
          >
            <Check className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save & Start Tracking"}
          </Button>
        ) : (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canNext}
            className="w-full h-12 text-base font-semibold"
          >
            Continue <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
