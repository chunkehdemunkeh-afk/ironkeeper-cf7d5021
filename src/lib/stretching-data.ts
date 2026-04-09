export type Stretch = {
  id: string;
  name: string;
  holdTime: string;
  sets: number;
  targetArea: string;
  notes: string;
  videoUrl: string;
};

// ── Complete stretch library ─────────────────────────────────────────────────
const LIB: Record<string, Stretch> = {
  // Lower body
  hip_flexor:   { id: "hip_flexor",   name: "Hip Flexor Lunge Stretch", holdTime: "30s each side", sets: 2, targetArea: "Hip Flexors",        notes: "Rear knee down, squeeze glute, push hips forward", videoUrl: "https://www.youtube.com/shorts/-D1HDRNXkoc" },
  hamstring:    { id: "hamstring",    name: "Standing Hamstring Stretch", holdTime: "30s each side", sets: 2, targetArea: "Hamstrings",          notes: "Straight leg on raised surface, hinge at hips, keep back flat", videoUrl: "https://www.youtube.com/shorts/vC_MRFVreq8" },
  quad:         { id: "quad",         name: "Standing Quad Stretch",      holdTime: "30s each side", sets: 2, targetArea: "Quadriceps",          notes: "Pull heel to glute, keep knees together, squeeze glute for deeper stretch", videoUrl: "https://www.youtube.com/shorts/AgaPoGEYTZ4" },
  pigeon:       { id: "pigeon",       name: "Pigeon Pose",                holdTime: "45s each side", sets: 2, targetArea: "Hips / Glutes",       notes: "Front shin parallel, fold forward slowly — deep hip opener for heavy lower body sessions", videoUrl: "https://www.youtube.com/shorts/sjSJcXS9tXA" },
  butterfly:    { id: "butterfly",    name: "Butterfly Groin Stretch",    holdTime: "45s",           sets: 2, targetArea: "Groin / Adductors",   notes: "Soles together, gently press knees down with elbows — opens adductors for squat depth", videoUrl: "https://www.youtube.com/shorts/dF2olILOtjM" },
  calf_wall:    { id: "calf_wall",    name: "Calf Wall Stretch",          holdTime: "30s each side", sets: 2, targetArea: "Calves / Achilles",   notes: "Back leg straight, heel flat to floor — hold then bend knee for soleus", videoUrl: "https://www.youtube.com/shorts/KHQwpBgZs4E" },
  figure4:      { id: "figure4",      name: "Figure-4 Glute Stretch",     holdTime: "40s each side", sets: 2, targetArea: "Glutes / Piriformis", notes: "Cross ankle over opposite knee, pull toward chest — alleviates lower back tightness after deadlifts", videoUrl: "https://www.youtube.com/shorts/hvJu48kpxK0" },
  ankle_circle: { id: "ankle_circle", name: "Ankle Circles",              holdTime: "10 each way",   sets: 2, targetArea: "Ankles / Mobility",   notes: "Slow full circles in both directions — primes ankle joint for explosive work and heavy squats", videoUrl: "https://www.youtube.com/shorts/WNFcJDTuWlI", },
  lower_back:   { id: "lower_back",   name: "Supine Knee Hug",            holdTime: "30s each side", sets: 2, targetArea: "Lower Back / SI Joint", notes: "Lie flat, hug one knee to chest — decompresses L4/L5 after heavy deadlifts", videoUrl: "https://www.youtube.com/shorts/lX3UIb4VVUs" },
  it_band:      { id: "it_band",      name: "Standing IT Band Stretch",   holdTime: "30s each side", sets: 2, targetArea: "IT Band / Hip",       notes: "Cross one leg over the other and lean to the side — targets outer knee tightness from leg days", videoUrl: "https://www.youtube.com/shorts/ZJ5Z3Ot6HEU" },

  // Upper body
  doorway_chest: { id: "doorway_chest", name: "Doorway Chest Stretch",        holdTime: "30s each side", sets: 2, targetArea: "Chest / Pec Minor",    notes: "Elbow at 90°, lean into the doorway — opens pecs and shoulder capsule after pressing", videoUrl: "https://www.youtube.com/shorts/K9MuSsJmYOY" },
  shoulder_cb:   { id: "shoulder_cb",  name: "Cross-Body Shoulder Stretch",   holdTime: "30s each side", sets: 2, targetArea: "Deltoids",             notes: "Pull arm across chest, keep shoulder down — maintains pressing and rowing range", videoUrl: "https://www.youtube.com/shorts/aIq0fLi8iak" },
  tricep_oh:     { id: "tricep_oh",    name: "Overhead Tricep Stretch",        holdTime: "30s each side", sets: 2, targetArea: "Triceps",              notes: "Arm overhead, hand behind head, gentle pull with opposite hand — targets long head of tricep", videoUrl: "https://www.youtube.com/shorts/_Nt2nLCYRlI" },
  wrist:         { id: "wrist",        name: "Wrist Flexor & Extensor",        holdTime: "20s each way",  sets: 2, targetArea: "Wrists / Forearms",    notes: "Arm straight, pull fingers back then down — essential after any pressing or pulling session", videoUrl: "https://www.youtube.com/shorts/rhMlBSWMdEI" },
  lat_side:      { id: "lat_side",     name: "Standing Lat Side Stretch",      holdTime: "30s each side", sets: 2, targetArea: "Lats / Obliques",     notes: "Arm overhead, lean to the side slowly — decompresses the spine and opens lats after pulling", videoUrl: "https://www.youtube.com/shorts/RJFiZN0p-io" },
  upper_trap:    { id: "upper_trap",   name: "Neck & Upper Trap Tilt",         holdTime: "30s each side", sets: 2, targetArea: "Upper Traps / Neck",  notes: "Ear toward shoulder, opposite hand down — releases upper trap tightness from pressing and shrugs", videoUrl: "https://www.youtube.com/shorts/iWS553j3k7Q" },
  rear_delt:     { id: "rear_delt",    name: "Bent-Over Rear Delt Stretch",    holdTime: "30s each side", sets: 2, targetArea: "Rear Delts",          notes: "Arm across hips, lean to opposite side — targets rear delt tightness from rowing movements", videoUrl: "https://www.youtube.com/shorts/aIq0fLi8iak" },
  childs_pose:   { id: "childs_pose",  name: "Child's Pose Lat Stretch",       holdTime: "45s",           sets: 2, targetArea: "Lats / Thoracic",     notes: "Arms extended forward, sink hips to heels — decompresses thoracic spine and opens lats", videoUrl: "https://www.youtube.com/shorts/ghCHSM_xX_0" },
  doorframe_bic: { id: "doorframe_bic", name: "Doorframe Bicep Stretch",       holdTime: "30s each side", sets: 2, targetArea: "Biceps / Chest",      notes: "Hand on doorframe at hip height, rotate body away — releases bicep and chest tightness after curls", videoUrl: "https://www.youtube.com/shorts/K9MuSsJmYOY" },

  // Core / spine
  cat_cow:       { id: "cat_cow",      name: "Cat-Cow",                        holdTime: "10 reps",       sets: 2, targetArea: "Spine / Core",        notes: "Slow controlled breathing, full arch and round — mobilises every level of the spine", videoUrl: "https://www.youtube.com/shorts/WHUevrqeKIg" },
  thoracic_rot:  { id: "thoracic_rot", name: "Seated Thoracic Rotation",       holdTime: "10 reps each",  sets: 2, targetArea: "Thoracic Spine",      notes: "Sit upright, arms crossed, rotate at mid-back not hips — essential for overhead press health", videoUrl: "https://www.youtube.com/shorts/mqFpFsECdoU" },
};

// ── Workout ID → ordered stretch list ────────────────────────────────────────
const MAP: Record<string, Array<keyof typeof LIB>> = {
  // Daily full-body + GK mix
  daily_gk: ["hip_flexor", "hamstring", "quad", "butterfly", "ankle_circle", "pigeon", "cat_cow", "shoulder_cb", "doorway_chest", "calf_wall"],

  // GK workouts
  power:    ["hip_flexor", "quad", "hamstring", "butterfly", "ankle_circle", "pigeon"],
  agility:  ["hip_flexor", "butterfly", "ankle_circle", "quad", "it_band", "calf_wall"],
  strength: ["hamstring", "quad", "hip_flexor", "shoulder_cb", "cat_cow", "lower_back"],
  reflexes: ["shoulder_cb", "wrist", "upper_trap", "rear_delt", "cat_cow", "thoracic_rot"],

  // Gym workout types
  push:           ["doorway_chest", "shoulder_cb", "tricep_oh", "wrist", "upper_trap"],
  pull:           ["lat_side", "childs_pose", "rear_delt", "wrist", "upper_trap"],
  legs:           ["hip_flexor", "hamstring", "quad", "butterfly", "calf_wall", "pigeon"],
  upper:          ["doorway_chest", "lat_side", "shoulder_cb", "tricep_oh", "upper_trap"],
  fullbody:       ["cat_cow", "hip_flexor", "doorway_chest", "hamstring", "lat_side", "ankle_circle"],
  chest_back:     ["doorway_chest", "childs_pose", "shoulder_cb", "thoracic_rot", "wrist"],
  shoulders_arms: ["shoulder_cb", "tricep_oh", "upper_trap", "wrist", "rear_delt"],
  chest:          ["doorway_chest", "shoulder_cb", "tricep_oh", "wrist", "upper_trap"],
  back:           ["lat_side", "childs_pose", "rear_delt", "wrist", "lower_back"],
  shoulders:      ["shoulder_cb", "upper_trap", "tricep_oh", "rear_delt", "wrist"],
  arms:           ["tricep_oh", "wrist", "doorframe_bic", "rear_delt", "lat_side"],
  // 5/3/1 days
  squat:    ["hip_flexor", "hamstring", "quad", "butterfly", "calf_wall", "figure4"],
  bench:    ["doorway_chest", "shoulder_cb", "tricep_oh", "wrist", "upper_trap"],
  deadlift: ["hip_flexor", "hamstring", "lower_back", "cat_cow", "lat_side", "figure4"],
  press:    ["shoulder_cb", "upper_trap", "tricep_oh", "rear_delt", "wrist"],
};

const DEFAULT_KEY = "fullbody";

export function getStretchesForWorkout(workoutId: string): Stretch[] {
  const keys = MAP[workoutId] ?? MAP[DEFAULT_KEY];
  return keys.map((key, i) => ({ ...LIB[key], id: `str_${workoutId}_${i}` }));
}

// Legacy — used by old GK default rendering
export const DAILY_STRETCHES: Stretch[] = getStretchesForWorkout("power");

export function getTotalStretchTime(stretches?: Stretch[]): string {
  const count = stretches?.length ?? DAILY_STRETCHES.length;
  const mins = Math.round(count * 1.5);
  return `~${mins} min`;
}
