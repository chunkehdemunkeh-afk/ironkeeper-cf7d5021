export type LibraryExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  description: string;
  videoId?: string; // YouTube Short ID
};

export const MUSCLE_GROUPS_ALL = [
  "All", "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quads", "Hamstrings", "Glutes", "Calves", "Core",
  "Forearms", "Full Body", "Plyometric", "Agility",
];

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // Chest
  { id: "lib-1", name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", description: "Lie flat, press bar from chest to lockout." },
  { id: "lib-2", name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbells", description: "Press dumbbells on a 30-45° incline bench." },
  { id: "lib-3", name: "Push-Ups", muscleGroup: "Chest", equipment: "Bodyweight", description: "Classic push-up, chest to floor." },
  { id: "lib-4", name: "Cable Flyes", muscleGroup: "Chest", equipment: "Cables", description: "Squeeze chest together with cable handles." },
  { id: "lib-5", name: "Dips", muscleGroup: "Chest", equipment: "Bodyweight", description: "Lean forward to target chest on parallel bars." },

  // Back
  { id: "lib-6", name: "Pull-Ups", muscleGroup: "Back", equipment: "Bodyweight", description: "Overhand grip, pull chin over bar." },
  { id: "lib-7", name: "Barbell Row", muscleGroup: "Back", equipment: "Barbell", description: "Hinge forward, row bar to lower chest." },
  { id: "lib-8", name: "Lat Pulldown", muscleGroup: "Back", equipment: "Cable", description: "Pull wide bar to upper chest." },
  { id: "lib-9", name: "Seated Cable Row", muscleGroup: "Back", equipment: "Cable", description: "Row handle to midsection, squeeze shoulder blades." },
  { id: "lib-10", name: "Single-Arm Dumbbell Row", muscleGroup: "Back", equipment: "Dumbbell", description: "Row dumbbell to hip with one arm on bench." },

  // Shoulders
  { id: "lib-11", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", description: "Press bar from front rack to overhead lockout." },
  { id: "lib-12", name: "Lateral Raise", muscleGroup: "Shoulders", equipment: "Dumbbells", description: "Raise dumbbells to sides until parallel to floor." },
  { id: "lib-13", name: "Face Pulls", muscleGroup: "Shoulders", equipment: "Cable", description: "Pull rope to face, external rotate at top." },
  { id: "lib-14", name: "Arnold Press", muscleGroup: "Shoulders", equipment: "Dumbbells", description: "Rotating dumbbell press — palms in to palms out." },
  { id: "lib-15", name: "Rear Delt Fly", muscleGroup: "Shoulders", equipment: "Dumbbells", description: "Bent over, raise dumbbells to sides." },

  // Biceps
  { id: "lib-16", name: "Barbell Curl", muscleGroup: "Biceps", equipment: "Barbell", description: "Curl bar with strict form, no swinging." },
  { id: "lib-17", name: "Hammer Curl", muscleGroup: "Biceps", equipment: "Dumbbells", description: "Neutral grip curls for brachialis and forearms." },
  { id: "lib-18", name: "Incline Dumbbell Curl", muscleGroup: "Biceps", equipment: "Dumbbells", description: "Curl on incline bench for stretch." },

  // Triceps
  { id: "lib-19", name: "Tricep Pushdown", muscleGroup: "Triceps", equipment: "Cable", description: "Push cable attachment down, lock out elbows." },
  { id: "lib-20", name: "Overhead Tricep Extension", muscleGroup: "Triceps", equipment: "Dumbbell", description: "Extend dumbbell overhead behind head." },
  { id: "lib-21", name: "Close Grip Bench Press", muscleGroup: "Triceps", equipment: "Barbell", description: "Bench press with narrow grip for triceps." },

  // Quads
  { id: "lib-22", name: "Back Squat", muscleGroup: "Quads", equipment: "Barbell", description: "Bar on traps, squat to parallel or below." },
  { id: "lib-23", name: "Leg Press", muscleGroup: "Quads", equipment: "Machine", description: "Press platform away with legs." },
  { id: "lib-24", name: "Leg Extension", muscleGroup: "Quads", equipment: "Machine", description: "Extend legs against pad for quad isolation." },
  { id: "lib-25", name: "Goblet Squat", muscleGroup: "Quads", equipment: "Dumbbell", description: "Hold dumbbell at chest, squat deep." },
  { id: "lib-26", name: "Bulgarian Split Squat", muscleGroup: "Quads", equipment: "Dumbbells", description: "Rear foot elevated, lunge down." },

  // Hamstrings
  { id: "lib-27", name: "Romanian Deadlift", muscleGroup: "Hamstrings", equipment: "Barbell", description: "Hinge at hips, lower bar along legs." },
  { id: "lib-28", name: "Leg Curl", muscleGroup: "Hamstrings", equipment: "Machine", description: "Curl legs against pad for hamstring isolation." },
  { id: "lib-29", name: "Nordic Hamstring Curl", muscleGroup: "Hamstrings", equipment: "Bodyweight", description: "Kneel, slowly lower body forward." },
  { id: "lib-30", name: "Good Morning", muscleGroup: "Hamstrings", equipment: "Barbell", description: "Bar on traps, hinge forward at hips." },

  // Glutes
  { id: "lib-31", name: "Hip Thrust", muscleGroup: "Glutes", equipment: "Barbell", description: "Back on bench, thrust hips up with bar on lap." },
  { id: "lib-32", name: "Glute Bridge", muscleGroup: "Glutes", equipment: "Bodyweight", description: "Lie flat, squeeze glutes to lift hips." },
  { id: "lib-33", name: "Cable Kickback", muscleGroup: "Glutes", equipment: "Cable", description: "Kick leg back against cable resistance." },

  // Calves
  { id: "lib-34", name: "Standing Calf Raise", muscleGroup: "Calves", equipment: "Machine", description: "Rise up on toes, squeeze calves at top." },
  { id: "lib-35", name: "Seated Calf Raise", muscleGroup: "Calves", equipment: "Machine", description: "Knees bent, raise heels for soleus focus." },

  // Core
  { id: "lib-36", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", description: "Hold body in straight line on forearms." },
  { id: "lib-37", name: "Dead Bug", muscleGroup: "Core", equipment: "Bodyweight", description: "On back, extend opposite arm and leg." },
  { id: "lib-38", name: "Hanging Leg Raise", muscleGroup: "Core", equipment: "Pull-up Bar", description: "Hang, raise legs to parallel or above." },
  { id: "lib-39", name: "Ab Wheel Rollout", muscleGroup: "Core", equipment: "Ab Wheel", description: "Roll out and return with core control." },
  { id: "lib-40", name: "Oblique Leg Raise", muscleGroup: "Core", equipment: "Bodyweight", description: "Lie on side, raise legs together using obliques." },
  { id: "lib-41", name: "Copenhagen Adductor", muscleGroup: "Core", equipment: "Bodyweight", description: "Side plank with top leg on bench, lift bottom leg." },

  // Forearms
  { id: "lib-42", name: "Wrist Curls", muscleGroup: "Forearms", equipment: "Dumbbell", description: "Rest forearm on bench, curl wrist up." },
  { id: "lib-43", name: "Farmer's Walk", muscleGroup: "Forearms", equipment: "Dumbbells", description: "Walk with heavy dumbbells, shoulders back." },
  { id: "lib-44", name: "Reverse Curl", muscleGroup: "Forearms", equipment: "Barbell", description: "Overhand grip curl for forearm development." },

  // Full Body
  { id: "lib-45", name: "Deadlift", muscleGroup: "Full Body", equipment: "Barbell", description: "Hinge and pull bar from floor to lockout." },
  { id: "lib-46", name: "Clean & Press", muscleGroup: "Full Body", equipment: "Barbell", description: "Clean bar to shoulders, press overhead." },
  { id: "lib-47", name: "Kettlebell Swing", muscleGroup: "Full Body", equipment: "Kettlebell", description: "Hip-snap driven swing to chest height." },
  { id: "lib-48", name: "Burpees", muscleGroup: "Full Body", equipment: "Bodyweight", description: "Drop, push-up, jump — full body conditioning." },
  { id: "lib-49", name: "Turkish Get-Up", muscleGroup: "Full Body", equipment: "Kettlebell", description: "Stand up from lying with weight overhead." },

  // Plyometric
  { id: "lib-50", name: "Box Jumps", muscleGroup: "Plyometric", equipment: "Box", description: "Jump onto box with both feet, stand tall." },
  { id: "lib-51", name: "Depth Jumps", muscleGroup: "Plyometric", equipment: "Box", description: "Step off box, immediately jump max height." },
  { id: "lib-52", name: "Plyo Push-Up", muscleGroup: "Plyometric", equipment: "Bodyweight", description: "Explosive push-up, hands leave ground." },
  { id: "lib-53", name: "Med Ball Slam", muscleGroup: "Plyometric", equipment: "Medicine Ball", description: "Overhead extension, slam ball to ground." },
  { id: "lib-54", name: "Lateral Bound", muscleGroup: "Plyometric", equipment: "Bodyweight", description: "Leap side to side, stick each landing." },

  // Agility
  { id: "lib-55", name: "Lateral Shuffle", muscleGroup: "Agility", equipment: "None", description: "Low stance, quick shuffle side to side." },
  { id: "lib-56", name: "T-Drill", muscleGroup: "Agility", equipment: "Cones", description: "Sprint, shuffle, backpedal in T pattern." },
  { id: "lib-57", name: "Ladder Drills", muscleGroup: "Agility", equipment: "Agility Ladder", description: "Quick feet through ladder rungs." },
  { id: "lib-58", name: "Carioca / Grapevine", muscleGroup: "Agility", equipment: "None", description: "Lateral cross-step drill for hip mobility." },
];
