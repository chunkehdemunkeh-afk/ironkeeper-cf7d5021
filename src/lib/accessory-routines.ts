import type { Exercise } from "./workout-data";
import type { SubstituteExercise } from "./exercise-substitutions";

export type AccessoryRoutine = {
  id: string;
  name: string;
  emoji: string;
  exercises: Exercise[];
  superset?: boolean; // if true, all exercises in this routine are performed as a superset
};

export const ACCESSORY_ROUTINES: AccessoryRoutine[] = [
  {
    id: "acc-abs",
    name: "Abs",
    emoji: "🔥",
    superset: true,
    exercises: [
      { id: "acc-abs1", name: "Cable Crunches", sets: 3, reps: "12-15", targetMuscle: "Abs", notes: "SUPERSET with Oblique Leg Raises — focus on curling the torso, not pulling with arms" },
      { id: "acc-abs2", name: "Oblique Leg Raises", sets: 3, reps: "12-15 each", targetMuscle: "Obliques", notes: "SUPERSET with Cable Crunches — lie on side, raise legs together using obliques, controlled lowering", trackWeight: false },
    ],
  },
  {
    id: "acc-grip",
    name: "Grip",
    emoji: "🤝",
    exercises: [
      { id: "acc-grip1", name: "Pinch Grip Plate Holds", sets: 3, reps: "12-15", targetMuscle: "Grip Strength", notes: "Pinch two plates smooth-side-out, hold for time — enter seconds held", repLabel: "Held (s)", trackWeight: true },
      { id: "acc-grip2", name: "Farmer's Walk", sets: 3, reps: "12-15", targetMuscle: "Grip Strength", notes: "Heavy as possible, shoulders back, quick steps", repLabel: "Lengths" },
    ],
  },
  {
    id: "acc-wrists",
    name: "Wrist Strength",
    emoji: "💪",
    superset: true,
    exercises: [
      { id: "acc-wrist1", name: "Wrist Curls", sets: 2, reps: "12-15", targetMuscle: "Forearms", notes: "SUPERSET with Reverse Wrist Curls — seated, forearms on thighs, curl the wrist up slowly" },
      { id: "acc-wrist2", name: "Reverse Wrist Curls", sets: 2, reps: "12-15", targetMuscle: "Forearm Extensors", notes: "SUPERSET with Wrist Curls — same position, palms down, lighter weight than regular curls" },
    ],
  },
];

export const ACCESSORY_SUBSTITUTIONS: Record<string, SubstituteExercise[]> = {
  // Cable Crunches
  "acc-abs1": [
    { id: "sub-abs1a", name: "Hanging Knee Raises", targetMuscle: "Abs", notes: "Controlled raise, no swinging, pause at top", trackWeight: false, repLabel: "Reps", description: "Hanging ab exercise targeting lower abs" },
    { id: "sub-abs1b", name: "Ab Wheel Rollouts", targetMuscle: "Abs", notes: "Full extension, squeeze back to start, keep hips tucked", trackWeight: false, repLabel: "Reps", description: "Progressive core stability and strength" },
  ],
  // Oblique Leg Raises
  "acc-abs2": [
    { id: "sub-abs2a", name: "Bicycle Crunches", targetMuscle: "Obliques", notes: "Opposite elbow to knee, slow and controlled", trackWeight: false, repLabel: "Reps", description: "Dynamic rotational crunch for obliques" },
    { id: "sub-abs2b", name: "Woodchoppers (Cable)", targetMuscle: "Obliques", notes: "High-to-low or low-to-high, rotate through the core", description: "Cable rotation for oblique power" },
  ],
  // Pinch Grip Plate Holds
  "acc-grip1": [
    { id: "sub-grip1a", name: "Towel Hang", targetMuscle: "Grip Strength", notes: "Drape towel over bar, hang as long as possible", trackWeight: false, repLabel: "Sec", description: "Thick grip dead hang for grip endurance" },
    { id: "sub-grip1b", name: "Fat Gripz Dumbbell Holds", targetMuscle: "Grip Strength", notes: "Hold heavy dumbbells with fat grips for time", repLabel: "Sec", description: "Thick-bar static hold for crushing grip" },
  ],
  // Farmer's Walk
  "acc-grip2": [
    { id: "sub-grip2a", name: "Dead Hang", targetMuscle: "Grip Strength", notes: "Hang from pull-up bar, relax shoulders, max time", trackWeight: false, repLabel: "Sec", description: "Simple bar hang for grip endurance" },
    { id: "sub-grip2b", name: "Plate Curls", targetMuscle: "Grip Strength", notes: "Curl a plate by its rim, slow eccentric", description: "Plate rim curl for wrist and finger strength" },
  ],
  // Wrist Curls
  "acc-wrist1": [
    { id: "sub-wrist1a", name: "Behind-the-Back Barbell Wrist Curls", targetMuscle: "Forearms", notes: "Stand holding barbell behind you, curl wrists up", description: "Standing wrist curl variation for forearm flexors" },
    { id: "sub-wrist1b", name: "Cable Wrist Curls", targetMuscle: "Forearms", notes: "Low pulley, seated, smooth controlled curls", description: "Constant tension wrist curl using cable" },
  ],
  // Reverse Wrist Curls
  "acc-wrist2": [
    { id: "sub-wrist2a", name: "Reverse Barbell Curls", targetMuscle: "Forearm Extensors", notes: "EZ bar or straight bar, overhand grip, controlled tempo", description: "Compound forearm extensor movement" },
    { id: "sub-wrist2b", name: "Radial/Ulnar Deviation", targetMuscle: "Forearm Extensors", notes: "Hold dumbbell vertically, tilt wrist side to side", description: "Wrist deviation for balanced forearm strength" },
  ],
};
