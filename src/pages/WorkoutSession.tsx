import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { WORKOUTS, type CompletedWorkout } from "@/lib/workout-data";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import { saveWorkoutToCloud, fetchLastSessionData, fetchExerciseLastData } from "@/lib/cloud-data";
import { ArrowLeft, Check, Timer, ChevronDown, ChevronUp, Trophy, Play, RotateCcw, TrendingUp, TrendingDown, GripVertical, Shuffle, Star, MessageSquare, Plus, Trash2, Flame, Grip, History } from "lucide-react";
import { motion, AnimatePresence, Reorder, useDragControls, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { toast } from "sonner";
import RestTimer from "@/components/RestTimer";
import ExerciseTimer from "@/components/ExerciseTimer";
import ExerciseVideoSheet from "@/components/ExerciseVideoSheet";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { EXERCISE_SUBSTITUTIONS, type SubstituteExercise } from "@/lib/exercise-substitutions";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "@/lib/accessory-routines";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type SetLog = { reps: number; weight: number; completed: boolean };

function SwipeableSetRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -60], [1, 0]);
  const deleteBgOpacity = useTransform(x, [-100, -30], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < -80) {
      onDelete();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background */}
      <motion.div
        style={{ opacity: deleteBgOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-3 bg-destructive/20 rounded-lg"
      >
        <motion.div style={{ opacity: deleteOpacity }}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </motion.div>
      </motion.div>
      {/* Foreground content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}

function ExerciseDragItem({ 
  exId, isExpanded, allDone, index, name, sets, reps, onToggleExpand, onPlayVideo, onSwap, hasSubs, lastSub, children 
}: { 
  exId: string; isExpanded: boolean; allDone: boolean; index: number; name: string; sets: number; reps: string; 
  onToggleExpand: () => void; onPlayVideo: () => void; onSwap: () => void; hasSubs: boolean;
  lastSub?: { subName: string; subId: string };
  children: React.ReactNode;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={exId}
      dragListener={false}
      dragControls={dragControls}
      className={`glass-card rounded-xl overflow-hidden transition-all ${allDone ? "ring-1 ring-success/40 opacity-70" : ""}`}
      style={{ position: "relative" }}
    >
      <div className="w-full flex items-center gap-2 p-3">
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex h-8 w-6 items-center justify-center cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center gap-3 text-left"
        >
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${allDone ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
            {allDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{sets} × {reps}</p>
            {lastSub && (
              <div className="flex items-center gap-1 mt-0.5">
                <Shuffle className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">
                  Last session: {lastSub.subName}
                </span>
              </div>
            )}
          </div>
        </button>
        <button
          onClick={onPlayVideo}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary mr-1"
        >
          <Play className="h-3 w-3" />
        </button>
        {hasSubs && (
          <button
            onClick={onSwap}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/50 text-accent-foreground mr-1 hover:bg-accent transition-colors"
            title="Swap exercise"
          >
            <Shuffle className="h-3 w-3" />
          </button>
        )}
        <button onClick={onToggleExpand}>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>
      {children}
    </Reorder.Item>
  );
}

import { useQueryClient } from "@tanstack/react-query";

export default function WorkoutSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const workout = WORKOUTS.find((w) => w.id === id) || getAllCustomWorkouts().find((w) => w.id === id);

  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [lastExerciseNotes, setLastExerciseNotes] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [effortRating, setEffortRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [exerciseOverrides, setExerciseOverrides] = useState<Record<string, { name: string; notes?: string; targetMuscle: string; trackWeight?: boolean; repLabel?: string; weightLabel?: string; substituteId?: string }>>({});
  // Substitutions used in the PREVIOUS session for this workout (for visual cue)
  const [lastSubstitutions, setLastSubstitutions] = useState<Record<string, { subName: string; subId: string }>>({}); 
  // Get the effective exercise ID for data lookups (substitute ID if swapped, otherwise original)
  const getEffectiveExId = useCallback((originalId: string) => {
    return exerciseOverrides[originalId]?.substituteId || originalId;
  }, [exerciseOverrides]);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [restDuration, setRestDuration] = useState(workout?.id === "power" ? 45 : 60);
  const [videoExercise, setVideoExercise] = useState<{ name: string; id: string } | null>(null);
  const [lastSessionData, setLastSessionData] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [weightUpSuggestions, setWeightUpSuggestions] = useState<Record<string, number[]>>({});
  const [weightDownSuggestions, setWeightDownSuggestions] = useState<Record<string, number[]>>({});
  const [addedAccessories, setAddedAccessories] = useState<string[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const autoSaveKey = workout ? `workout-autosave-${workout.id}` : null;

  // Auto-save session state to localStorage
  const saveSessionToStorage = useCallback(() => {
    if (!autoSaveKey || !started || finished || showFeedback) return;
    const sessionState = {
      setLogs,
      exerciseNotes,
      exerciseOrder,
      exerciseOverrides,
      addedAccessories,
      elapsed,
      expandedExercise,
      weightUpSuggestions,
      weightDownSuggestions,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(sessionState));
    } catch (e) {
      console.warn("Failed to auto-save workout:", e);
    }
  }, [autoSaveKey, started, finished, showFeedback, setLogs, exerciseNotes, exerciseOrder, exerciseOverrides, addedAccessories, elapsed, expandedExercise, weightUpSuggestions, weightDownSuggestions]);

  // Save on visibility change (user switching apps / leaving)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveSessionToStorage();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", saveSessionToStorage);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", saveSessionToStorage);
    };
  }, [saveSessionToStorage]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    if (!started || finished || showFeedback) return;
    const interval = setInterval(saveSessionToStorage, 30000);
    return () => clearInterval(interval);
  }, [started, finished, showFeedback, saveSessionToStorage]);

  // Clear auto-save on finish
  const clearAutoSave = useCallback(() => {
    if (autoSaveKey) {
      localStorage.removeItem(autoSaveKey);
    }
  }, [autoSaveKey]);

  // Check for saved session on mount
  useEffect(() => {
    if (!autoSaveKey) return;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only offer resume if saved less than 4 hours ago
        if (parsed.savedAt && Date.now() - parsed.savedAt < 4 * 60 * 60 * 1000) {
          setShowResumePrompt(true);
        } else {
          localStorage.removeItem(autoSaveKey);
        }
      }
    } catch {
      localStorage.removeItem(autoSaveKey);
    }
  }, [autoSaveKey]);

  const resumeSavedSession = useCallback(() => {
    if (!autoSaveKey) return;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSetLogs(parsed.setLogs || {});
        setExerciseNotes(parsed.exerciseNotes || {});
        setExerciseOrder(parsed.exerciseOrder || []);
        setExerciseOverrides(parsed.exerciseOverrides || {});
        setAddedAccessories(parsed.addedAccessories || []);
        setElapsed(parsed.elapsed || 0);
        setExpandedExercise(parsed.expandedExercise || null);
        setWeightUpSuggestions(parsed.weightUpSuggestions || {});
        setWeightDownSuggestions(parsed.weightDownSuggestions || {});
        setStarted(true);
        setShowResumePrompt(false);
        toast.success("Session resumed! 💪");
      }
    } catch {
      setShowResumePrompt(false);
    }
  }, [autoSaveKey]);

  const discardSavedSession = useCallback(() => {
    clearAutoSave();
    setShowResumePrompt(false);
  }, [clearAutoSave]);

  // Load last session data, notes, and weight-up suggestions
  useEffect(() => {
    if (!workout) return;
    fetchLastSessionData(workout.id).then(setLastSessionData);
    try {
      const saved = localStorage.getItem(`exercise-notes-${workout.id}`);
      if (saved) setLastExerciseNotes(JSON.parse(saved));
    } catch {}
    try {
      const savedSubs = localStorage.getItem(`exercise-subs-${workout.id}`);
      if (savedSubs) setLastSubstitutions(JSON.parse(savedSubs));
    } catch {}
    try {
      const suggestions = localStorage.getItem(`weight-up-${workout.id}`);
      if (suggestions) setWeightUpSuggestions(JSON.parse(suggestions));
    } catch {}
    try {
      const downSuggestions = localStorage.getItem(`weight-down-${workout.id}`);
      if (downSuggestions) setWeightDownSuggestions(JSON.parse(downSuggestions));
    } catch {}
  }, [workout]);

  // Compute all exercises including accessories
  const accessoryExercises = addedAccessories.flatMap(accId => {
    const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
    return routine ? routine.exercises : [];
  });
  const allExercises = workout ? [...workout.exercises, ...accessoryExercises] : [];

  // Build superset group map: exerciseId → { groupLabel, exerciseIds, isFirst, isLast }
  const supersetMap = useMemo(() => {
    const map: Record<string, { groupLabel: string; exerciseIds: string[]; isFirst: boolean; isLast: boolean }> = {};
    for (const accId of addedAccessories) {
      const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
      if (routine?.superset && routine.exercises.length > 1) {
        const ids = routine.exercises.map(e => e.id);
        ids.forEach((id, idx) => {
          map[id] = {
            groupLabel: `${routine.emoji} ${routine.name} — Superset`,
            exerciseIds: ids,
            isFirst: idx === 0,
            isLast: idx === ids.length - 1,
          };
        });
      }
    }
    return map;
  }, [addedAccessories]);

  useEffect(() => {
    if (!workout) return;
    const initial: Record<string, SetLog[]> = {};
    workout.exercises.forEach((ex) => {
      if (!setLogs[ex.id]) {
        initial[ex.id] = Array.from({ length: ex.sets }, () => ({
          reps: 0,
          weight: 0,
          completed: false,
        }));
      }
    });
    if (Object.keys(initial).length > 0) {
      setSetLogs(prev => ({ ...prev, ...initial }));
    }
    if (exerciseOrder.length === 0) {
      setExpandedExercise(workout.exercises[0]?.id ?? null);
      setExerciseOrder(workout.exercises.map(ex => ex.id));
    }
  }, [workout, lastSessionData]);

  const addAccessory = useCallback((accId: string) => {
    const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
    if (!routine || addedAccessories.includes(accId)) return;
    setAddedAccessories(prev => [...prev, accId]);
    const newLogs: Record<string, SetLog[]> = {};
    routine.exercises.forEach(ex => {
      newLogs[ex.id] = Array.from({ length: ex.sets }, () => ({ reps: 0, weight: 0, completed: false }));
    });
    setSetLogs(prev => ({ ...prev, ...newLogs }));
    setExerciseOrder(prev => [...prev, ...routine.exercises.map(ex => ex.id)]);
    hapticMedium();
    toast.success(`Added ${routine.name} accessory`);
  }, [addedAccessories]);

  useEffect(() => {
    if (!started || finished) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [started, finished]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggleSet = useCallback((exerciseId: string, setIdx: number) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...updated[exerciseId]];
      const wasCompleted = sets[setIdx].completed;
      sets[setIdx] = { ...sets[setIdx], completed: !wasCompleted };
      updated[exerciseId] = sets;
      if (!wasCompleted) {
        hapticMedium();
        setRestTimerActive(true);
        setRestTimerKey((k) => k + 1);

        // Determine rep thresholds based on exercise target range
        const exercise = allExercises.find(e => e.id === exerciseId);
        const isAccessoryRange = exercise?.reps?.includes("12-15");
        const upThreshold = isAccessoryRange ? 15 : 12;
        const downThreshold = isAccessoryRange ? 12 : 8;

        // Check if reps >= threshold → suggest weight increase
        if (sets[setIdx].reps >= upThreshold) {
          const exName = exercise?.name || exerciseId;
          toast.info(`💪 ${exName} — Set ${setIdx + 1} hit ${sets[setIdx].reps} reps! Consider adding weight next session.`);
          setWeightUpSuggestions((prev) => {
            const existing = prev[exerciseId] || [];
            if (!existing.includes(setIdx)) {
              return { ...prev, [exerciseId]: [...existing, setIdx] };
            }
            return prev;
          });
        }

        // Check if reps < threshold → suggest weight decrease
        if (sets[setIdx].reps > 0 && sets[setIdx].reps < downThreshold) {
          const exName = exercise?.name || exerciseId;
          toast.warning(`⚠️ ${exName} — Set ${setIdx + 1} only ${sets[setIdx].reps} reps. Consider lowering weight next session.`);
          setWeightDownSuggestions((prev) => {
            const existing = prev[exerciseId] || [];
            if (!existing.includes(setIdx)) {
              return { ...prev, [exerciseId]: [...existing, setIdx] };
            }
            return prev;
          });
        }

        // Auto-expand next exercise if this was the last set
        const allSetsNowDone = sets.every((s) => s.completed);
        if (allSetsNowDone) {
          const currentOrderIdx = exerciseOrder.indexOf(exerciseId);
          if (currentOrderIdx >= 0 && currentOrderIdx < exerciseOrder.length - 1) {
            const nextExId = exerciseOrder[currentOrderIdx + 1];
            setExpandedExercise(nextExId);
          }
        }
      }
      return updated;
    });
  }, [workout, exerciseOrder, allExercises]);

  const updateSetField = useCallback(
    (exerciseId: string, setIdx: number, field: "reps" | "weight", value: number) => {
      setSetLogs((prev) => {
        const updated = { ...prev };
        const sets = [...updated[exerciseId]];
        sets[setIdx] = { ...sets[setIdx], [field]: value };
        updated[exerciseId] = sets;
        return updated;
      });
    }, []
  );

  const addSet = useCallback((exerciseId: string) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      sets.push({ reps: 0, weight: 0, completed: false });
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  const deleteSet = useCallback((exerciseId: string, setIdx: number) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      if (sets.length <= 1) return prev; // Don't delete the last set
      sets.splice(setIdx, 1);
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  const orderedExercises = workout
    ? exerciseOrder.map(id => allExercises.find(ex => ex.id === id)!).filter(Boolean)
    : [];

  const completedExercises = allExercises.filter((ex) => setLogs[ex.id]?.every((s) => s.completed)).length;
  const totalExercises = allExercises.length;

  const handleFinish = () => {
    if (!workout) return;
    const notesToSave = Object.fromEntries(
      Object.entries(exerciseNotes).filter(([_, v]) => v.trim())
    );
    // Always overwrite so stale notes from a previous session are cleared
    if (Object.keys(notesToSave).length > 0) {
      localStorage.setItem(`exercise-notes-${workout.id}`, JSON.stringify(notesToSave));
    } else {
      localStorage.removeItem(`exercise-notes-${workout.id}`);
    }
    // Save substitute map so next session can show a visual cue
    const subMap: Record<string, { subName: string; subId: string }> = {};
    Object.entries(exerciseOverrides).forEach(([origId, override]) => {
      if (override.substituteId) {
        subMap[origId] = { subName: override.name, subId: override.substituteId };
      }
    });
    if (Object.keys(subMap).length > 0) {
      localStorage.setItem(`exercise-subs-${workout.id}`, JSON.stringify(subMap));
    } else {
      localStorage.removeItem(`exercise-subs-${workout.id}`);
    }
    if (Object.keys(weightUpSuggestions).length > 0) {
      localStorage.setItem(`weight-up-${workout.id}`, JSON.stringify(weightUpSuggestions));
    } else {
      localStorage.removeItem(`weight-up-${workout.id}`);
    }
    if (Object.keys(weightDownSuggestions).length > 0) {
      localStorage.setItem(`weight-down-${workout.id}`, JSON.stringify(weightDownSuggestions));
    } else {
      localStorage.removeItem(`weight-down-${workout.id}`);
    }
    setShowFeedback(true);
  };

  const handleSubmitFeedback = () => {
    if (!workout) return;
    const hasCompletedAny = completedExercises > 0;
    
    const completed: CompletedWorkout = {
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString(),
      duration: elapsed > 0 ? Math.max(1, Math.ceil(elapsed / 60)) : 0,
      exercisesCompleted: completedExercises,
      totalExercises,
      sets: Object.entries(setLogs).flatMap(([exId, sets]) =>
        sets.filter((s) => s.completed).map((s) => ({ exerciseId: getEffectiveExId(exId), reps: s.reps, weight: s.weight }))
      ),
      effortRating: effortRating > 0 ? effortRating : undefined,
      sessionNotes: sessionNotes.trim() || undefined,
    };
    
    if (!hasCompletedAny) {
      if (!window.confirm("You haven't completed any exercises in this session. Finish anyway?")) {
        return;
      }
    }
    
    saveWorkoutToCloud(completed);
    
    // Invalidate all related queries to force a refresh on other screens
    queryClient.invalidateQueries({ queryKey: ["workout-history"] });
    queryClient.invalidateQueries({ queryKey: ["volume-data"] });
    queryClient.invalidateQueries({ queryKey: ["personal-records"] });
    
    clearAutoSave();
    setFinished(true);
    hapticSuccess();
    toast.success("Workout saved! 💪");
  };

  const hasLastSession = Object.keys(lastSessionData).length > 0;

  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  if (showFeedback && !finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="font-display text-2xl font-bold text-foreground">How was that session?</h1>
        <p className="text-muted-foreground mt-1 text-sm">Rate your effort and leave a note for your coach</p>

        {/* Effort Rating */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Effort Rating</p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setEffortRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= effortRating
                      ? "text-primary fill-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {effortRating > 0 && (
            <p className="text-xs text-muted-foreground">
              {effortRating === 1 && "Easy — barely broke a sweat"}
              {effortRating === 2 && "Light — comfortable effort"}
              {effortRating === 3 && "Moderate — good workout"}
              {effortRating === 4 && "Hard — really pushed it"}
              {effortRating === 5 && "Max effort — gave everything"}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="mt-6 w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">Notes for Coach</p>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Any pain, fatigue, or feedback..."
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{sessionNotes.length}/500</p>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSubmitFeedback}
            className="rounded-xl gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground glow-primary"
          >
            {effortRating > 0 || sessionNotes.trim() ? "Submit & Finish" : "Skip & Finish"}
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-foreground">Session Complete!</h1>
        <p className="text-muted-foreground mt-2">
          {completedExercises}/{totalExercises} exercises · {formatTime(elapsed)}
        </p>
        <button onClick={() => navigate("/")} className="mt-8 rounded-xl gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground glow-primary">
          Back to Home
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6 pb-8 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className={`glass-card-elevated rounded-2xl p-6 bg-gradient-to-br ${workout.color}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 mb-3">
              <workout.icon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold">{workout.name}</h1>
            <p className="text-muted-foreground mt-1">{workout.focus}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {workout.exercises.length} exercises · ~35 min
            </p>
            {hasLastSession && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
                <RotateCcw className="h-3 w-3" />
                <span>Weights auto-filled from last session</span>
              </div>
            )}
          </div>

          {/* Weight increase reminders from last session */}
          {Object.keys(weightUpSuggestions).length > 0 && (
            <div className="glass-card rounded-xl p-3 border border-primary/30 bg-primary/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Weight increase suggested</span>
              </div>
              {Object.entries(weightUpSuggestions).map(([exId, setIdxs]) => {
                const exName = workout.exercises.find(e => e.id === exId)?.name || exId;
                return (
                  <p key={exId} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{exName}</span> — Set{setIdxs.length > 1 ? "s" : ""} {setIdxs.map(s => s + 1).join(", ")} hit 12+ reps last time
                  </p>
                );
              })}
            </div>
          )}

          {/* Weight decrease reminders from last session */}
          {Object.keys(weightDownSuggestions).length > 0 && (
            <div className="glass-card rounded-xl p-3 border border-destructive/30 bg-destructive/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Weight decrease suggested</span>
              </div>
              {Object.entries(weightDownSuggestions).map(([exId, setIdxs]) => {
                const exName = workout.exercises.find(e => e.id === exId)?.name || exId;
                return (
                  <p key={exId} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{exName}</span> — Set{setIdxs.length > 1 ? "s" : ""} {setIdxs.map(s => s + 1).join(", ")} under 8 reps last time
                  </p>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {workout.exercises.map((ex, i) => (
              <div key={ex.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.sets} × {ex.reps}
                    {ex.notes && ` · ${ex.notes}`}
                  </p>
                  {lastSessionData[getEffectiveExId(ex.id)] && (
                    <p className="text-[10px] text-success/80 mt-0.5">
                      Last: {lastSessionData[getEffectiveExId(ex.id)].map(s => `${s.weight}kg×${s.reps}`).join(", ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setVideoExercise({ name: ex.name, id: ex.id })}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Play className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-muted-foreground rounded-md bg-muted/50 px-2 py-0.5">
                  {ex.targetMuscle}
                </span>
              </div>
            ))}
          </div>

          {showResumePrompt && (
            <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <RotateCcw className="h-4 w-4" />
                <span>Unfinished session found</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You have a previous session in progress. Would you like to pick up where you left off?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resumeSavedSession}
                  className="flex-1 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform"
                >
                  Resume Session
                </button>
                <button
                  onClick={discardSavedSession}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground active:scale-[0.98] transition-transform"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => { discardSavedSession(); setStarted(true); }}
            className="w-full rounded-xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform"
          >
            {showResumePrompt ? "Start Fresh" : "Start Workout"}
          </button>
        </div>

        <ExerciseVideoSheet
          open={!!videoExercise}
          onOpenChange={(open) => !open && setVideoExercise(null)}
          exerciseName={videoExercise?.name || ""}
          exerciseId={videoExercise?.id || ""}
        />
      </div>
    );
  }

  // Active workout
  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { saveSessionToStorage(); navigate("/sessions"); }} className="text-muted-foreground p-2 -m-2 active:bg-muted/50 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { saveSessionToStorage(); navigate(`/history?workout=${workout?.id}`); }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-2.5 py-1.5 active:bg-muted/50 transition-colors"
            title="View past sessions"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
          <div className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 border border-border/50">
            <Timer className="h-3.5 w-3.5 text-primary" />
            <span className="font-display text-sm font-bold tabular-nums">{formatTime(elapsed)}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedExercises}/{totalExercises}
          </span>
          <select
            value={restDuration}
            onChange={(e) => setRestDuration(Number(e.target.value))}
            className="text-[10px] bg-card border border-border/50 rounded-full px-2 py-1 text-muted-foreground outline-none"
          >
            <option value={45}>45s</option>
            <option value={60}>60s</option>
            <option value={75}>75s</option>
            <option value={90}>90s</option>
            <option value={120}>2m</option>
            <option value={180}>3m</option>
          </select>
        </div>



        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full gradient-primary rounded-full"
            animate={{ width: `${(completedExercises / totalExercises) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Exercises */}
        <Reorder.Group axis="y" values={exerciseOrder} onReorder={setExerciseOrder} className="space-y-2">
          {orderedExercises.map((ex, i) => {
            const isExpanded = expandedExercise === ex.id;
            const allDone = setLogs[ex.id]?.every((s) => s.completed);
            const override = exerciseOverrides[ex.id];
            const displayName = override?.name || ex.name;
            const allSubs = { ...EXERCISE_SUBSTITUTIONS, ...ACCESSORY_SUBSTITUTIONS };
            const hasSubs = !!(allSubs[ex.id] && allSubs[ex.id].length > 0);
            const ssInfo = supersetMap[ex.id];

            const exerciseCard = (
              <ExerciseDragItem
                key={ex.id}
                exId={ex.id}
                isExpanded={isExpanded}
                allDone={allDone}
                index={i}
                name={displayName}
                sets={setLogs[ex.id]?.length || ex.sets}
                reps={ex.reps}
                onToggleExpand={() => setExpandedExercise(isExpanded ? null : ex.id)}
                onPlayVideo={() => setVideoExercise({ name: displayName, id: ex.id })}
                onSwap={() => setSwapExerciseId(ex.id)}
                hasSubs={hasSubs}
                lastSub={!override ? lastSubstitutions[ex.id] : undefined}
              >

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2">
                        {(override?.notes || ex.notes) && (
                          <p className="text-[11px] text-primary/80 bg-primary/5 rounded-lg px-2 py-1.5">
                            {override?.notes || ex.notes}
                          </p>
                        )}
                        <textarea
                          placeholder={lastExerciseNotes[ex.id] || "Add notes for this exercise..."}
                          value={exerciseNotes[ex.id] || ""}
                          onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                          rows={1}
                          className="w-full rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 resize-none"
                        />
                        {(() => {
                          const showWeight = (override?.trackWeight ?? ex.trackWeight) !== false;
                          const repLabel = override?.repLabel || ex.repLabel || "Reps";
                          const weightLabel = override?.weightLabel || ex.weightLabel || "Kg";
                          const isTimeBased = repLabel === "Sec";
                          
                          const parseTargetSeconds = (reps: string) => {
                            const match = reps.match(/(\d+)/);
                            return match ? parseInt(match[1], 10) : 30;
                          };
                          const targetSec = isTimeBased ? parseTargetSeconds(ex.reps) : 0;

                          return (
                            <>
                              <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider`}>
                                <span className="text-center">Set</span>
                                {!isTimeBased && showWeight && <span className="text-center">{weightLabel}</span>}
                                <span className="text-center">{isTimeBased ? "Timer" : repLabel}</span>
                                <span className="text-center">✓</span>
                              </div>
                              {setLogs[ex.id]?.map((set, si) => (
                                <SwipeableSetRow
                                  key={si}
                                  onDelete={() => deleteSet(ex.id, si)}
                                >
                                  <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center bg-background`}>
                                    <span className={`text-xs font-medium text-center ${set.completed ? "text-success" : "text-muted-foreground"}`}>{si + 1}</span>
                                    {isTimeBased ? (
                                      <ExerciseTimer
                                        targetSeconds={targetSec}
                                        onComplete={(secs) => {
                                          updateSetField(ex.id, si, "reps", secs);
                                          toggleSet(ex.id, si);
                                        }}
                                      />
                                    ) : (
                                      <>
                                        {showWeight && (
                                          <input type="number" inputMode="decimal" placeholder={lastSessionData[getEffectiveExId(ex.id)]?.[si]?.weight?.toString() || "0"} value={set.weight || ""} onChange={(e) => updateSetField(ex.id, si, "weight", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                        )}
                                        <input type="number" inputMode="numeric" placeholder={lastSessionData[getEffectiveExId(ex.id)]?.[si]?.reps?.toString() || "0"} value={set.reps || ""} onChange={(e) => updateSetField(ex.id, si, "reps", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                      </>
                                    )}
                                    <button onClick={() => toggleSet(ex.id, si)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${set.completed ? "bg-success text-success-foreground glow-success" : "bg-muted/50 text-muted-foreground border border-border/50"}`}>
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </SwipeableSetRow>
                              ))}
                              {/* Add Set button */}
                              <button
                                onClick={() => addSet(ex.id)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mt-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Set
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ExerciseDragItem>
            );

            // Skip non-first superset members (rendered inside the group wrapper)
            if (ssInfo && !ssInfo.isFirst) return null;

            // Wrap superset groups with a visual indicator
            if (ssInfo?.isFirst) {
              const groupExIds = ssInfo.exerciseIds;
              return (
                <div key={`ss-${ex.id}`} className="relative">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-0.5">
                      <span className="text-[10px]">🔄</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground">Superset</span>
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="relative pl-3 space-y-2">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-primary via-primary/60 to-primary" />
                    {groupExIds.map((gExId) => {
                      const gEx = allExercises.find(e => e.id === gExId);
                      if (!gEx) return null;
                      const gIsExpanded = expandedExercise === gExId;
                      const gAllDone = setLogs[gExId]?.every((s) => s.completed);
                      const gOverride = exerciseOverrides[gExId];
                      const gDisplayName = gOverride?.name || gEx.name;
                      const gHasSubs = !!(allSubs[gExId] && allSubs[gExId].length > 0);
                      const gIdx = orderedExercises.indexOf(gEx);

                      return (
                        <ExerciseDragItem
                          key={gExId}
                          exId={gExId}
                          isExpanded={gIsExpanded}
                          allDone={gAllDone}
                          index={gIdx}
                          name={gDisplayName}
                          sets={setLogs[gExId]?.length || gEx.sets}
                          reps={gEx.reps}
                          onToggleExpand={() => setExpandedExercise(gIsExpanded ? null : gExId)}
                          onPlayVideo={() => setVideoExercise({ name: gDisplayName, id: gExId })}
                          onSwap={() => setSwapExerciseId(gExId)}
                          hasSubs={gHasSubs}
                        >
                          <AnimatePresence>
                            {gIsExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 space-y-2">
                                  {(gOverride?.notes || gEx.notes) && (
                                    <p className="text-[11px] text-primary/80 bg-primary/5 rounded-lg px-2 py-1.5">
                                      {gOverride?.notes || gEx.notes}
                                    </p>
                                  )}
                                  <textarea
                                    placeholder={lastExerciseNotes[gExId] || "Add notes for this exercise..."}
                                    value={exerciseNotes[gExId] || ""}
                                    onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [gExId]: e.target.value }))}
                                    rows={1}
                                    className="w-full rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 resize-none"
                                  />
                                  {(() => {
                                    const showWeight = (gOverride?.trackWeight ?? gEx.trackWeight) !== false;
                                    const repLabel = gOverride?.repLabel || gEx.repLabel || "Reps";
                                    const weightLabel = gOverride?.weightLabel || gEx.weightLabel || "Kg";
                                    const isTimeBased = repLabel === "Sec";
                                    const parseTargetSeconds = (reps: string) => {
                                      const match = reps.match(/(\d+)/);
                                      return match ? parseInt(match[1], 10) : 30;
                                    };
                                    const targetSec = isTimeBased ? parseTargetSeconds(gEx.reps) : 0;

                                    return (
                                      <>
                                        <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider`}>
                                          <span className="text-center">Set</span>
                                          {!isTimeBased && showWeight && <span className="text-center">{weightLabel}</span>}
                                          <span className="text-center">{isTimeBased ? "Timer" : repLabel}</span>
                                          <span className="text-center">✓</span>
                                        </div>
                                        {setLogs[gExId]?.map((set, si) => (
                                          <SwipeableSetRow key={si} onDelete={() => deleteSet(gExId, si)}>
                                            <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center bg-background`}>
                                              <span className={`text-xs font-medium text-center ${set.completed ? "text-success" : "text-muted-foreground"}`}>{si + 1}</span>
                                              {isTimeBased ? (
                                                <ExerciseTimer targetSeconds={targetSec} onComplete={(secs) => { updateSetField(gExId, si, "reps", secs); toggleSet(gExId, si); }} />
                                              ) : (
                                                <>
                                                  {showWeight && (
                                                    <input type="number" inputMode="decimal" placeholder={lastSessionData[getEffectiveExId(gExId)]?.[si]?.weight?.toString() || "0"} value={set.weight || ""} onChange={(e) => updateSetField(gExId, si, "weight", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                                  )}
                                                  <input type="number" inputMode="numeric" placeholder={lastSessionData[getEffectiveExId(gExId)]?.[si]?.reps?.toString() || "0"} value={set.reps || ""} onChange={(e) => updateSetField(gExId, si, "reps", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                                </>
                                              )}
                                              <button onClick={() => toggleSet(gExId, si)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${set.completed ? "bg-success text-success-foreground glow-success" : "bg-muted/50 text-muted-foreground border border-border/50"}`}>
                                                <Check className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          </SwipeableSetRow>
                                        ))}
                                        <button onClick={() => addSet(gExId)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mt-1">
                                          <Plus className="h-3 w-3" />
                                          Add Set
                                        </button>
                                      </>
                                    );
                                  })()}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </ExerciseDragItem>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return exerciseCard;
          })}
        </Reorder.Group>

        {/* Add Accessory Routines */}
        {ACCESSORY_ROUTINES.filter(r => !addedAccessories.includes(r.id)).length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Accessory</p>
            <div className="flex gap-2">
              {ACCESSORY_ROUTINES.filter(r => !addedAccessories.includes(r.id)).map(routine => (
                <button
                  key={routine.id}
                  onClick={() => addAccessory(routine.id)}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <span>{routine.emoji}</span>
                  <span>{routine.name}</span>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <RestTimer key={restTimerKey} isActive={restTimerActive} initialSeconds={restDuration} onClose={() => setRestTimerActive(false)} onTimerEnd={() => toast("Rest complete! Time for the next set 💪")} />

      <ExerciseVideoSheet
        open={!!videoExercise}
        onOpenChange={(open) => !open && setVideoExercise(null)}
        exerciseName={videoExercise?.name || ""}
        exerciseId={videoExercise?.id || ""}
      />

      {/* Swap Exercise Sheet */}
      <Sheet open={!!swapExerciseId} onOpenChange={(open) => !open && setSwapExerciseId(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border/50 max-h-[60vh]">
          <SheetHeader>
            <SheetTitle className="font-display text-lg text-foreground flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-primary" />
              Swap Exercise
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-2 overflow-y-auto max-h-[40vh] pb-4">
            {swapExerciseId && (
              <>
                {/* Original exercise option */}
                {exerciseOverrides[swapExerciseId] && (() => {
                  const origEx = allExercises.find(e => e.id === swapExerciseId);
                  return origEx ? (
                    <button
                      onClick={() => {
                        setExerciseOverrides(prev => {
                          const next = { ...prev };
                          delete next[swapExerciseId];
                          return next;
                        });
                        setSwapExerciseId(null);
                        hapticMedium();
                        toast.success(`Swapped back to ${origEx.name}`);
                      }}
                      className="w-full text-left rounded-xl bg-secondary/50 p-3 hover:bg-secondary/70 transition-colors border border-border/30"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{origEx.name}</p>
                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">Original</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{origEx.targetMuscle}</p>
                    </button>
                  ) : null;
                })()}
                {/* Substitute options */}
                {([...( EXERCISE_SUBSTITUTIONS[swapExerciseId] || []), ...(ACCESSORY_SUBSTITUTIONS[swapExerciseId] || [])]).map((sub) => {
                  const isActive = exerciseOverrides[swapExerciseId]?.name === sub.name;
                  return (
                    <button
                      key={sub.id}
                      onClick={async () => {
                        setExerciseOverrides(prev => ({
                          ...prev,
                          [swapExerciseId]: {
                            name: sub.name,
                            notes: sub.notes,
                            targetMuscle: sub.targetMuscle,
                            trackWeight: sub.trackWeight,
                            repLabel: sub.repLabel,
                            weightLabel: sub.weightLabel,
                            substituteId: sub.id,
                          },
                        }));
                        // Fetch last data for this specific substitute exercise
                        if (!lastSessionData[sub.id]) {
                          const subData = await fetchExerciseLastData(sub.id);
                          if (subData.length > 0) {
                            setLastSessionData(prev => ({ ...prev, [sub.id]: subData }));
                          }
                        }
                        setSwapExerciseId(null);
                        hapticMedium();
                        toast.success(`Swapped to ${sub.name}`);
                      }}
                      disabled={isActive}
                      className={`w-full text-left rounded-xl p-3 transition-colors border ${isActive ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border/30 hover:bg-secondary/70"}`}
                    >
                      <p className="text-sm font-medium text-foreground">{sub.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{sub.targetMuscle}</span>
                        {sub.notes && <span className="text-[10px] text-primary/70">{sub.notes}</span>}
                      </div>
                      {isActive && <span className="text-[10px] text-primary font-medium mt-1 block">Currently selected</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="mx-auto max-w-lg">
          <button onClick={handleFinish} className="w-full rounded-xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform">
            Finish Workout ({completedExercises}/{totalExercises})
          </button>
        </div>
      </div>
    </div>
  );
}
