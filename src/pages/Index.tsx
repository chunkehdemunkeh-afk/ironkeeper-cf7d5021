import { useEffect } from "react";
import { getGreeting } from "@/lib/workout-data";
import { useAuth } from "@/hooks/useAuth";
import WeekStrip from "@/components/WeekStrip";
import NextSessionCard from "@/components/NextSessionCard";
import StatsBar from "@/components/StatsBar";
import DailyStretchCard from "@/components/DailyStretchCard";
import HomeDailySummary from "@/components/HomeDailySummary";
import { isGKSplit } from "@/lib/user-preferences";

import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name?.split(" ")[0] || "Athlete";
  const gkMode = user ? isGKSplit(user.id) : false;

  // Remind GK users to do daily stretches if not yet completed
  useEffect(() => {
    if (!user || !gkMode) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const reminderKey = `stretch-reminder-shown-${todayStr}`;
    if (sessionStorage.getItem(reminderKey)) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("stretch_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();
      if (!data) {
        sessionStorage.setItem(reminderKey, "1");
        toast("Don't forget your daily stretches! 🧘", {
          description: "10 minutes to keep your body match-ready.",
          duration: 6000,
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, gkMode]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-2xl font-bold">
            {getGreeting()}, <span className="text-gradient-primary">{displayName}!</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        </motion.div>

        {/* Stats */}
        <StatsBar />

        {/* Week strip */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            This Week
          </p>
          <WeekStrip />
        </div>

        {/* Next session */}
        <NextSessionCard />

        {/* Daily nutrition & water summary */}
        <HomeDailySummary />

        {/* Pre-workout stretches — adapts to the user's next workout */}
        <DailyStretchCard />

      </div>
    </div>
  );
};

export default Index;
