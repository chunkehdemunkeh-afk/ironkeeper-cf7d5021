import { motion } from "framer-motion";
import { Heart } from "lucide-react";

type SplitTips = { title: string; tips: string[] };

const TIPS: Record<string, SplitTips> = {
  gk: {
    title: "GK Recovery Tips",
    tips: [
      "Get 8-9 hours of sleep — growth hormone peaks during deep sleep.",
      "Stay hydrated — aim for 2-3 litres daily, more on training days.",
      "Eat enough protein — 1.4-1.6g per kg of bodyweight.",
      "Stretch on rest days — focus on hip flexors, hamstrings, and shoulders.",
      "Grip work — squeeze a tennis ball daily for wrist and finger strength.",
    ],
  },
  ppl: {
    title: "PPL Training Tips",
    tips: [
      "Train every set to failure or 1 rep in reserve (RIR 0-1) — this is what drives hypertrophy.",
      "Progressive overload is the priority — if you can't add weight, add a rep or an extra set.",
      "Rest 2-3 min between heavy compounds; 60-90 seconds is enough on isolation exercises.",
      "Eat in a slight surplus (200-300 kcal over maintenance) to support maximal muscle growth.",
      "Target 2.0-2.2g protein per kg bodyweight and spread it across at least 4 meals.",
    ],
  },
  pplu: {
    title: "Push/Pull/Legs/Upper Tips",
    tips: [
      "Train to failure on isolation work; leave 1-2 RIR on heavy compounds to protect longevity.",
      "The extra upper day means chest and back get hit twice — prioritise those recovery meals.",
      "Rest 2-3 min between compound sets — don't rush just because the session looks shorter.",
      "Eating in a surplus is essential at this volume. If in doubt, eat more.",
      "Deload every 6-8 weeks — high frequency programmes collect fatigue faster than you notice.",
    ],
  },
  pplul: {
    title: "5-Day Split Tips",
    tips: [
      "Go to failure on isolation work; distribute intensity on compounds (don't max out every day).",
      "High frequency needs high recovery — 8+ hours of sleep is non-negotiable at 5 days/week.",
      "Small incremental jumps (1-2.5kg) work better here than chasing big PR numbers each session.",
      "You will be eating more than a 3-day lifter — your TDEE is significantly higher.",
      "Listen for joint discomfort — 5-day programmes require excellent form on every rep.",
    ],
  },
  upper_lower: {
    title: "Upper/Lower Training Tips",
    tips: [
      "Focus on 4-6 reps for compound strength; 8-12 reps for accessory hypertrophy work.",
      "Rest 3-5 minutes on main lifts — full nervous system recovery is required for peak output.",
      "Leave 1-2 RIR on main lifts; push isolation exercises closer to or at failure.",
      "Lead upper days with your weakest pressing pattern; lead lower days with squat or hinge.",
      "Track bodyweight weekly — aim for 0.25-0.5kg gain per week for a clean lean bulk.",
    ],
  },
  fullbody: {
    title: "Full Body Training Tips",
    tips: [
      "Lead with the biggest compound movement first — you should be hitting squats, deadlifts, or bench fresh.",
      "Focus on perfecting form before adding weight — technique built early becomes second nature.",
      "2-3 quality sets per exercise is all you need — too much volume slows recovery between sessions.",
      "Leave at least 48 hours between full body sessions, or alternate days, to allow full recovery.",
      "Small jumps (2.5kg) every week compound faster than people expect — trust the process.",
    ],
  },
  arnold: {
    title: "Arnold Split Training Tips",
    tips: [
      "Superset antagonist muscles (bench + row, press + pulldown) — more volume in less time.",
      "Aim for 16-20 working sets per muscle per week — this split is designed to support that.",
      "Take isolation exercises to failure — the risk-to-reward is excellent for smaller muscles.",
      "Prioritise the bottom stretched position — research consistently shows it drives the most growth.",
      "Rotate intensity techniques every 3-4 weeks: drop sets, rest-pause, and forced reps prevent plateaus.",
    ],
  },
  bro: {
    title: "Bro Split Training Tips",
    tips: [
      "Use a slow 3-4 second eccentric (lowering) — it recruits more muscle fibres than rushing reps.",
      "Push every working set to failure or 1 RIR — you have 6 days before that muscle is trained again.",
      "Blood flow restriction (BFR/occlusion) on arms and calves adds pump volume without joint stress.",
      "High daily volume burns significantly more calories — don't undereat and wonder why you're not recovering.",
      "Take a full deload week every 6-8 weeks — reduce volume by 50% to let joints and CNS reset.",
    ],
  },
  "531": {
    title: "5/3/1 Strength Tips",
    tips: [
      "Never skip the AMRAP (last set) — that final set of as many reps as possible is where progress lives.",
      "Don't ego-lift. The training max (90% of 1RM) feels light by design — accumulate volume, not ego.",
      "Joker sets and First Set Last (FSL) are optional — only add them when you feel genuinely strong.",
      "The goal is 2.5kg on upper lifts and 5kg on lower lifts per 4-week cycle — that's 30kg per year.",
      "Sleep and food matter as much as the gym. 5/3/1 is a long-game programme — recover properly.",
    ],
  },
  custom: {
    title: "Training Tips",
    tips: [
      "Consistency beats intensity — showing up to every session is more important than any single workout.",
      "Track your weights and reps — progress is what you can measure, and what you measure, you improve.",
      "Rest days are programmed recovery, not failure. Plan them with the same intent as training days.",
      "Prioritise 7-9 hours of sleep — that's where muscle repair and hormonal recovery actually happen.",
      "Progressive overload — more weight, more reps, or more sets each week — is the only law of adaptation.",
    ],
  },
};

const DEFAULT_TIPS = TIPS.custom;

type Props = {
  splitId?: string;
};

export default function RecoveryTips({ splitId }: Props) {
  const { title, tips } = TIPS[splitId ?? ""] ?? DEFAULT_TIPS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card rounded-2xl p-4"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15">
          <Heart className="h-4.5 w-4.5 text-destructive" />
        </div>
        <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
      </div>
      <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
        {tips.map((tip, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
            <p>{tip}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
