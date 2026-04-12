// Mifflin-St Jeor TDEE Calculator

export type Gender = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type GoalType = "lose" | "maintain" | "gain";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (office job, little exercise)",
  light: "Lightly active (1-3 days/week)",
  moderate: "Moderately active (3-5 days/week)",
  active: "Active (6-7 days/week)",
  very_active: "Very active (athlete / physical job)",
};

export const GOAL_LABELS: Record<GoalType, string> = {
  lose: "Lose weight (-500 kcal)",
  maintain: "Maintain weight",
  gain: "Gain muscle (+300 kcal)",
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_OFFSETS: Record<GoalType, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

export function calculateTDEE(
  gender: Gender,
  age: number,
  heightCm: number,
  weightKg: number,
  activity: ActivityLevel,
  goal: GoalType
) {
  // Mifflin-St Jeor
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIERS[activity];
  const targetCalories = Math.round(tdee + GOAL_OFFSETS[goal]);

  // Standard macro split
  const proteinG = Math.round(weightKg * 2); // 2g/kg
  const fatG = Math.round((targetCalories * 0.25) / 9); // 25% from fat
  const carbsG = Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4);

  return { tdee: Math.round(tdee), targetCalories, proteinG, carbsG: Math.max(carbsG, 50), fatG };
}
