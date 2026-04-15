import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchDailyLogs, type DailyLog } from "@/lib/cloud-data";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Salad, ChevronLeft, ChevronRight, GitCompare } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, parseISO, startOfMonth, startOfWeek, endOfWeek } from "date-fns";

type Period = "day" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

// ── Tooltip styling ────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: { background: "hsl(220, 18%, 11%)", border: "1px solid hsl(220, 14%, 18%)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "hsl(40, 10%, 95%)" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string, period: Period) {
  const parsed = parseISO(d);
  if (period === "year") return format(parsed, "MMM");
  return format(parsed, "d MMM");
}

function MacroStat({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{Math.round(value)}</p>
      <div className="h-1 mt-1 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-current ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground mt-0.5">{pct}% of {Math.round(goal)}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DailyReviewChart() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [compare, setCompare] = useState(false);

  // For "day" period — which specific day is selected
  const [selectedDay, setSelectedDay] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["daily-logs", user?.id],
    queryFn: fetchDailyLogs,
    enabled: !!user,
  });

  // ── Slice logs for the current period window ────────────────────────────────
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const { currentLogs, previousLogs, xKey } = useMemo(() => {
    if (period === "day") {
      const current = logs.filter(l => l.date === selectedDay);
      const prev = logs.filter(l => l.date === format(subDays(parseISO(selectedDay), 1), "yyyy-MM-dd"));
      return { currentLogs: current, previousLogs: prev, xKey: "date" as const };
    }

    if (period === "week") {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const prevWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const prevWeekEnd = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
      return {
        currentLogs: logs.filter(l => l.date >= weekStart && l.date <= today),
        previousLogs: logs.filter(l => l.date >= prevWeekStart && l.date <= prevWeekEnd),
        xKey: "date" as const,
      };
    }

    if (period === "month") {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const prevMonthEnd = format(subDays(parseISO(monthStart), 1), "yyyy-MM-dd");
      return {
        currentLogs: logs.filter(l => l.date >= monthStart && l.date <= today),
        previousLogs: logs.filter(l => l.date >= prevMonthStart && l.date <= prevMonthEnd),
        xKey: "date" as const,
      };
    }

    // year — aggregate by month
    const yearStart = format(subYears(new Date(), 1), "yyyy-MM-dd");
    const prevYearStart = format(subYears(new Date(), 2), "yyyy-MM-dd");
    return {
      currentLogs: logs.filter(l => l.date >= yearStart && l.date <= today),
      previousLogs: logs.filter(l => l.date >= prevYearStart && l.date < yearStart),
      xKey: "date" as const,
    };
  }, [logs, period, selectedDay, today]);

  // ── Build chart data ────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === "year") {
      // Monthly averages
      const byMonth: Record<string, { calories: number[]; protein: number[]; label: string }> = {};
      currentLogs.forEach(l => {
        const monthKey = l.date.substring(0, 7);
        if (!byMonth[monthKey]) byMonth[monthKey] = { calories: [], protein: [], label: format(parseISO(l.date), "MMM") };
        byMonth[monthKey].calories.push(l.calories);
        byMonth[monthKey].protein.push(l.protein_g);
      });

      const prevByMonth: Record<string, { calories: number[]; protein: number[] }> = {};
      previousLogs.forEach(l => {
        const monthKey = l.date.substring(0, 7);
        if (!prevByMonth[monthKey]) prevByMonth[monthKey] = { calories: [], protein: [] };
        prevByMonth[monthKey].calories.push(l.calories);
        prevByMonth[monthKey].protein.push(l.protein_g);
      });

      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;

      return Object.entries(byMonth).map(([key, v]) => ({
        label: v.label,
        calories: avg(v.calories),
        protein: avg(v.protein),
        prevCalories: avg(prevByMonth[key]?.calories ?? []),
        prevProtein: avg(prevByMonth[key]?.protein ?? []),
      }));
    }

    // Day / week / month — per day entries
    const prevMap: Record<string, DailyLog> = {};
    if (compare) {
      const offset = period === "week" ? 7 : period === "month" ? 30 : 1;
      previousLogs.forEach(l => {
        const shifted = format(new Date(parseISO(l.date).getTime() + offset * 86400000), "yyyy-MM-dd");
        prevMap[shifted] = l;
      });
    }

    return currentLogs.map(l => ({
      label: fmtDate(l.date, period),
      date: l.date,
      calories: l.calories,
      protein: l.protein_g,
      carbs: l.carbs_g,
      fat: l.fat_g,
      water: Math.round(l.water_ml / 100) / 10, // litres
      calorieGoal: l.calorie_goal,
      prevCalories: prevMap[l.date]?.calories,
      prevProtein: prevMap[l.date]?.protein_g,
    }));
  }, [currentLogs, previousLogs, period, compare]);

  // ── Day view — single selected date detail ─────────────────────────────────
  const dayLog = period === "day" ? currentLogs[0] ?? null : null;
  const canGoPrev = period === "day" && logs.some(l => l.date < selectedDay);
  const canGoNext = period === "day" && selectedDay < today;

  if (isLoading) return null;

  if (logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-5 text-center"
      >
        <Salad className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No daily logs yet</p>
        <p className="text-xs text-muted-foreground mt-1">Press "Complete Day" on the home screen to start logging</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Salad className="h-4 w-4 text-emerald-400" />
          Daily Nutrition Review
        </h3>

        {/* Compare toggle (week / month / year only) */}
        {period !== "day" && (
          <button
            onClick={() => setCompare(c => !c)}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors
              ${compare
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            <GitCompare className="h-3 w-3" />
            Compare
          </button>
        )}
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all
              ${period === p
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* ── Day view ─────────────────────────────────────────────────────── */}
      {period === "day" && (
        <>
          {/* Day navigator */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedDay(d => format(subDays(parseISO(d), 1), "yyyy-MM-dd"))}
              disabled={!canGoPrev}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">
              {selectedDay === today ? "Today" : format(parseISO(selectedDay), "EEE d MMM yyyy")}
            </p>
            <button
              onClick={() => setSelectedDay(d => format(new Date(parseISO(d).getTime() + 86400000), "yyyy-MM-dd"))}
              disabled={!canGoNext}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {dayLog ? (
            <div className="space-y-3">
              {/* Macro bars */}
              <div className="flex gap-3">
                <MacroStat label="Calories" value={dayLog.calories} goal={dayLog.calorie_goal} color="text-primary" />
                <MacroStat label="Protein" value={dayLog.protein_g} goal={dayLog.protein_goal_g} color="text-blue-400" />
                <MacroStat label="Carbs" value={dayLog.carbs_g} goal={dayLog.carbs_goal_g} color="text-amber-400" />
                <MacroStat label="Fat" value={dayLog.fat_g} goal={dayLog.fat_goal_g} color="text-rose-400" />
              </div>
              {/* Water */}
              <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                <span>💧 Water</span>
                <span className="font-semibold text-foreground">
                  {(dayLog.water_ml / 1000).toFixed(1)}L / {(dayLog.water_goal_ml / 1000).toFixed(1)}L
                </span>
              </div>
              {dayLog.weight_kg && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>⚖️ Body weight</span>
                  <span className="font-semibold text-foreground">{dayLog.weight_kg}kg</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No log for this day — press "Complete Day" on the home screen
            </p>
          )}
        </>
      )}

      {/* ── Week / Month area chart ──────────────────────────────────────── */}
      {(period === "week" || period === "month") && chartData.length > 0 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -10, right: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(36, 95%, 55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="protGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(210, 80%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(210, 80%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} width={32} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="calories" name="Calories" stroke="hsl(36, 95%, 55%)" fill="url(#calGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="protein" name="Protein (g)" stroke="hsl(210, 80%, 60%)" fill="url(#protGrad)" strokeWidth={2} />
              {compare && (
                <>
                  <Area type="monotone" dataKey="prevCalories" name="Prev Cals" stroke="hsl(36, 95%, 55%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.5} />
                  <Area type="monotone" dataKey="prevProtein" name="Prev Protein" stroke="hsl(210, 80%, 60%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.5} />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Year bar chart ───────────────────────────────────────────────── */}
      {period === "year" && chartData.length > 0 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -10, right: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} width={32} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="calories" name="Avg Calories" fill="hsl(36, 95%, 55%)" radius={[3, 3, 0, 0]} />
              {compare && (
                <Bar dataKey="prevCalories" name="Prev Avg Cals" fill="hsl(36, 95%, 55%)" radius={[3, 3, 0, 0]} opacity={0.4} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state for chart periods */}
      {period !== "day" && chartData.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No logs for this {period} yet
        </p>
      )}

      {/* Legend */}
      {period !== "day" && chartData.length > 0 && (
        <div className="flex gap-4 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary inline-block" /> Calories
          </span>
          {(period === "week" || period === "month") && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" /> Protein
            </span>
          )}
          {compare && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-60">
              <span className="h-1.5 w-4 border-t-2 border-dashed border-primary inline-block" /> Prev {period}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
