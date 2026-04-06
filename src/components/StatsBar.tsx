import { fetchWorkoutHistory, fetchActivityLogs } from "@/lib/cloud-data";
import { Flame, Target, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences, computeWeeklyStreak } from "@/lib/user-preferences";


export default function StatsBar() {
  const { user } = useAuth();
  const prefs = user ? getUserPreferences(user.id) : null;
  const weekGoal = prefs?.daysPerWeek ?? 4;

  const { data: history = [] } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: fetchActivityLogs,
    enabled: !!user,
  });

  // ── This week's session count ──────────────────────────────────────────────
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (now.getDay() || 7) + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const weekDays = new Set<string>();
  history.forEach((w) => {
    const d = new Date(w.date);
    if (d >= weekStart) weekDays.add(d.toISOString().split("T")[0]);
  });
  activities.forEach((a) => {
    const d = new Date(a.date + "T00:00:00");
    if (d >= weekStart) weekDays.add(a.date);
  });
  const thisWeek = weekDays.size;

  // ── All training dates (for streak calc) ──────────────────────────────────
  const allDates = new Set<string>();
  history.forEach((w) => allDates.add(w.date.split("T")[0]));
  activities.forEach((a) => allDates.add(a.date));

  // ── Weekly streak ───────────────────────────────────────────────────
  const streak = computeWeeklyStreak(allDates, weekGoal);

  // ── Total training time ───────────────────────────────────────────────────
  const totalMinutes =
    history.reduce((s, w) => s + (w.duration || 0), 0) +
    activities.reduce((s, a) => s + (a.duration || 0), 0);

  const items = [
    {
      icon: Flame,
      value: streak > 0 ? `${streak} week` : "—",
      label: "Streak",
      color: streak > 0 ? "text-primary" : "text-muted-foreground",
    },
    {
      icon: Target,
      value: `${thisWeek}/${weekGoal}`,
      label: "This Week",
      color: thisWeek >= weekGoal ? "text-success" : "text-foreground",
    },
    {
      icon: Timer,
      value: `${totalMinutes}m`,
      label: "Total Time",
      color: "text-foreground",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 gap-2"
    >
      {items.map(({ icon: Icon, value, label, color }) => (
        <div key={label} className="glass-card rounded-xl px-3 py-3 text-center">
          <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
          <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
        </div>
      ))}
    </motion.div>
  );
}
