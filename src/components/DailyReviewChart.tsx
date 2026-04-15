import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchDailyLogs, fetchWorkoutHistory, type DailyLog } from "@/lib/cloud-data";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { CalendarCheck, ChevronLeft, ChevronRight, GitCompare, Dumbbell } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, parseISO, startOfMonth, startOfWeek, endOfWeek } from "date-fns";

type Period = "day" | "week" | "month" | "year";
type Metric = "weight" | "calories" | "water" | "volume";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
};

const METRIC_CONFIG: Record<Metric, { label: string; short: string; color: string; unit: string; areaOpacity: number }> = {
  weight: { label: "Body Weight", short: "Weight", color: "hsl(280, 70%, 65%)", unit: "kg", areaOpacity: 0.2 },
  calories: { label: "Calories", short: "Calories", color: "hsl(36, 95%, 55%)", unit: "kcal", areaOpacity: 0.3 },
  water: { label: "Water Intake", short: "Water", color: "hsl(190, 85%, 55%)", unit: "L", areaOpacity: 0.2 },
  volume: { label: "Total Lifted", short: "Volume", color: "hsl(140, 60%, 55%)", unit: "kg", areaOpacity: 0.2 },
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

function avg(arr: number[]) {
  const filtered = arr.filter(v => v > 0);
  return filtered.length ? filtered.reduce((s, v) => s + v, 0) / filtered.length : 0;
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
  const [metric, setMetric] = useState<Metric>("calories");
  const [compare, setCompare] = useState(false);

  // For "day" period — which specific day is selected
  const [selectedDay, setSelectedDay] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["daily-logs", user?.id],
    queryFn: fetchDailyLogs,
    enabled: !!user,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["workout-history", user?.id],
    queryFn: fetchWorkoutHistory,
    enabled: !!user,
  });

  const { data: volumeByDate = {} } = useQuery({
    queryKey: ["daily-volume", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: hData } = await supabase.from("workout_history").select("id, date").eq("user_id", user.id);
      if (!hData || hData.length === 0) return {};
      const historyToDate = Object.fromEntries(hData.map((h: any) => [h.id, h.date]));
      
      const { data: sData } = await supabase.from("workout_sets").select("workout_history_id, reps, weight").eq("user_id", user.id);
      if (!sData) return {};
      
      const vMap: Record<string, number> = {};
      sData.forEach((s: any) => {
        const date = historyToDate[s.workout_history_id];
        if (date) vMap[date] = (vMap[date] || 0) + (s.reps * s.weight);
      });
      return vMap;
    },
    enabled: !!user
  });

  // ── Slice logs for the current period window ────────────────────────────────
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const { currentLogs, previousLogs } = useMemo(() => {
    if (period === "day") {
      const current = logs.filter(l => l.date === selectedDay);
      const prev = logs.filter(l => l.date === format(subDays(parseISO(selectedDay), 1), "yyyy-MM-dd"));
      return { currentLogs: current, previousLogs: prev };
    }

    if (period === "week") {
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const prevWeekStart = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
      const prevWeekEnd = format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "yyyy-MM-dd");
      return {
        currentLogs: logs.filter(l => l.date >= weekStart && l.date <= today),
        previousLogs: logs.filter(l => l.date >= prevWeekStart && l.date <= prevWeekEnd),
      };
    }

    if (period === "month") {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd");
      const prevMonthEnd = format(subDays(parseISO(monthStart), 1), "yyyy-MM-dd");
      return {
        currentLogs: logs.filter(l => l.date >= monthStart && l.date <= today),
        previousLogs: logs.filter(l => l.date >= prevMonthStart && l.date <= prevMonthEnd),
      };
    }

    // year — aggregate by month
    const yearStart = format(subYears(new Date(), 1), "yyyy-MM-dd");
    const prevYearStart = format(subYears(new Date(), 2), "yyyy-MM-dd");
    return {
      currentLogs: logs.filter(l => l.date >= yearStart && l.date <= today),
      previousLogs: logs.filter(l => l.date >= prevYearStart && l.date < yearStart),
    };
  }, [logs, period, selectedDay, today]);

  // ── Build chart data ────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === "year") {
      // Monthly averages / sums
      const byMonth: Record<string, { 
        c: number[]; p: number[]; ca: number[]; f: number[]; wa: number[]; we: number[]; vol: number[]; label: string;
        prev_c: number[]; prev_p: number[]; prev_ca: number[]; prev_f: number[]; prev_wa: number[]; prev_we: number[]; prev_vol: number[];
      }> = {};
      
      const initMonth = (key: string, label: string) => {
        if (!byMonth[key]) byMonth[key] = { c: [], p: [], ca: [], f: [], wa: [], we: [], vol: [], label, prev_c: [], prev_p: [], prev_ca: [], prev_f: [], prev_wa: [], prev_we: [], prev_vol: [] };
      };

      currentLogs.forEach(l => {
        const key = l.date.substring(0, 7);
        initMonth(key, format(parseISO(l.date), "MMM"));
        byMonth[key].c.push(l.calories);
        byMonth[key].p.push(l.protein_g);
        byMonth[key].ca.push(l.carbs_g);
        byMonth[key].f.push(l.fat_g);
        byMonth[key].wa.push(l.water_ml);
        if (l.weight_kg) byMonth[key].we.push(l.weight_kg);
        if (volumeByDate[l.date]) byMonth[key].vol.push(volumeByDate[l.date]);
      });

      // Same for previous year
      previousLogs.forEach(l => {
        const shiftedDate = format(new Date(parseISO(l.date).getTime() + 365 * 86400000), "yyyy-MM-dd");
        const key = shiftedDate.substring(0, 7);
        if (byMonth[key]) {
          byMonth[key].prev_c.push(l.calories);
          byMonth[key].prev_p.push(l.protein_g);
          byMonth[key].prev_ca.push(l.carbs_g);
          byMonth[key].prev_f.push(l.fat_g);
          byMonth[key].prev_wa.push(l.water_ml);
          if (l.weight_kg) byMonth[key].prev_we.push(l.weight_kg);
          if (volumeByDate[l.date]) byMonth[key].prev_vol.push(volumeByDate[l.date]);
        }
      });

      return Object.entries(byMonth).map(([key, v]) => ({
        label: v.label,
        calories: avg(v.c),
        protein: avg(v.p),
        carbs: avg(v.ca),
        fat: avg(v.f),
        water: avg(v.wa) / 1000,
        weight: avg(v.we),
        volume: avg(v.vol),
        prevCalories: avg(v.prev_c),
        prevProtein: avg(v.prev_p),
        prevCarbs: avg(v.prev_ca),
        prevFat: avg(v.prev_f),
        prevWater: avg(v.prev_wa) / 1000,
        prevWeight: avg(v.prev_we),
        prevVolume: avg(v.prev_vol),
      }));
    }

    // Day / week / month — per day entries
    const prevMap: Record<string, DailyLog> = {};
    const prevWorkoutsMap: Record<string, number> = {};
    
    if (compare) {
      const offsetDays = period === "week" ? 7 : period === "month" ? 28 : 1; 
      previousLogs.forEach(l => {
        const shifted = format(new Date(parseISO(l.date).getTime() + offsetDays * 86400000), "yyyy-MM-dd");
        prevMap[shifted] = l;
      });
      workouts.forEach(w => {
        const shifted = format(new Date(parseISO(w.date).getTime() + offsetDays * 86400000), "yyyy-MM-dd");
        prevWorkoutsMap[shifted] = (prevWorkoutsMap[shifted] || 0) + 1;
      });
    }

    return currentLogs.map(l => {
      const isPrev = compare ? !!prevMap[l.date] : false;

      return {
        label: fmtDate(l.date, period),
        date: l.date,
        calories: l.calories,
        protein: l.protein_g,
        carbs: l.carbs_g,
        fat: l.fat_g,
        water: Math.round(l.water_ml / 100) / 10,
        weight: l.weight_kg ?? 0,
        volume: volumeByDate[l.date] || 0,
        prevCalories: isPrev ? prevMap[l.date]?.calories : undefined,
        prevProtein: isPrev ? prevMap[l.date]?.protein_g : undefined,
        prevCarbs: isPrev ? prevMap[l.date]?.carbs_g : undefined,
        prevFat: isPrev ? prevMap[l.date]?.fat_g : undefined,
        prevWater: isPrev && prevMap[l.date] ? (prevMap[l.date]?.water_ml || 0) / 1000 : undefined,
        prevWeight: isPrev ? prevMap[l.date]?.weight_kg : undefined,
        prevVolume: isPrev ? volumeByDate[prevMap[l.date]?.date] : undefined,
      };
    });
  }, [currentLogs, previousLogs, period, compare, volumeByDate]);

  // ── Day view — single selected date detail ─────────────────────────────────
  const dayLog = period === "day" ? currentLogs[0] ?? null : null;
  const dayWorkouts = period === "day" ? workouts.filter((w: any) => w.date === selectedDay) : [];
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
        <CalendarCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No daily logs yet</p>
        <p className="text-xs text-muted-foreground mt-1">Press "Complete Day" on the home screen to start logging</p>
      </motion.div>
    );
  }

  const selectedMetricConfig = METRIC_CONFIG[metric];
  
  // Custom tooltips
  const formatYAxis = (val: number) => {
    if (val === 0) return "";
    return val >= 1000 && metric === "calories" ? `${(val / 1000).toFixed(1)}k` : val;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 space-y-4"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          Daily Review
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

      {/* Metric Selector Pill Strip (Only showing if period != day) */}
      {period !== "day" && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x mask-edges">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`shrink-0 snap-start px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-colors
                ${metric === m 
                  ? "bg-secondary text-foreground border-border/80" 
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40"}`}
            >
              {METRIC_CONFIG[m].short}
            </button>
          ))}
        </div>
      )}

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

              {/* Workouts */}
              {dayWorkouts.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border/50">
                  <p className="text-[10px] uppercase font-semibold tracking-widest text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Dumbbell className="h-3 w-3" /> Training
                  </p>
                  <div className="space-y-1.5">
                    {dayWorkouts.map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center bg-secondary/40 rounded-lg p-2.5">
                        <span className="text-xs font-semibold text-foreground/90 leading-tight">
                          {w.workout_name}
                        </span>
                        <div className="flex gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-background rounded">
                            {w.exercises_completed} / {w.total_exercises} ex
                          </span>
                          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-background rounded">
                            {w.duration}m
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <AreaChart data={chartData} margin={{ left: -15, right: 0, bottom: 0, top: 10 }}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={selectedMetricConfig.color} stopOpacity={selectedMetricConfig.areaOpacity} />
                  <stop offset="95%" stopColor={selectedMetricConfig.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} tickFormatter={formatYAxis} axisLine={false} tickLine={false} width={38} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <Tooltip 
                {...tooltipStyle} 
                formatter={(val: number | string) => [
                  `${Number(val).toFixed(metric === 'water' || metric === 'weight' ? 1 : 0)}${selectedMetricConfig.unit}`, 
                  selectedMetricConfig.label
                ]} 
              />
              <Area 
                type="monotone" 
                dataKey={metric} 
                name={selectedMetricConfig.label} 
                stroke={selectedMetricConfig.color} 
                fill="url(#metricGrad)" 
                strokeWidth={2} 
                connectNulls
              />
              {compare && (
                <Area 
                  type="monotone" 
                  dataKey={`prev${metric.charAt(0).toUpperCase() + metric.slice(1)}`} 
                  name={`Prev ${selectedMetricConfig.label}`} 
                  stroke={selectedMetricConfig.color} 
                  fill="none" 
                  strokeWidth={1.5} 
                  strokeDasharray="4 2" 
                  opacity={0.5} 
                  connectNulls
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Year bar chart ───────────────────────────────────────────────── */}
      {period === "year" && chartData.length > 0 && (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -15, right: 0, bottom: 0, top: 10 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(220, 10%, 55%)" }} tickFormatter={formatYAxis} axisLine={false} tickLine={false} width={38} />
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <Tooltip 
                {...tooltipStyle} 
                formatter={(val: number | string) => [
                  `${Number(val).toFixed(metric === 'water' || metric === 'weight' ? 1 : 0)}${selectedMetricConfig.unit}`, 
                  selectedMetricConfig.label
                ]} 
              />
              <Bar 
                dataKey={metric} 
                name={`Avg ${selectedMetricConfig.label}`} 
                fill={selectedMetricConfig.color} 
                radius={[3, 3, 0, 0]} 
              />
              {compare && (
                <Bar 
                  dataKey={`prev${metric.charAt(0).toUpperCase() + metric.slice(1)}`} 
                  name={`Prev Avg ${selectedMetricConfig.label}`} 
                  fill={selectedMetricConfig.color} 
                  radius={[3, 3, 0, 0]} 
                  opacity={0.4} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      {period !== "day" && chartData.length > 0 && (
        <div className="flex gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: selectedMetricConfig.color }} /> {selectedMetricConfig.label}
          </span>
          {compare && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground opacity-60">
              <span className="h-1.5 w-4 border-t-2 border-dashed inline-block" style={{ borderColor: selectedMetricConfig.color }} /> Prev {period}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
