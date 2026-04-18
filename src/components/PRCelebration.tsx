import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { hapticSuccess } from "@/lib/haptics";

interface Props {
  pr: { name: string; weight: number; reps: number } | null;
  onDismiss: () => void;
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * 360;
  const rad = (angle * Math.PI) / 180;
  const distance = 90 + (i % 3) * 30;
  const colors = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];
  return {
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
    color: colors[i % colors.length],
    size: 7 + (i % 3) * 4,
  };
});

export default function PRCelebration({ pr, onDismiss }: Props) {
  useEffect(() => {
    if (!pr) return;
    hapticSuccess();
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [pr]);

  return (
    <AnimatePresence>
      {pr && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
        >
          <div className="relative flex flex-col items-center">
            {/* Particle burst */}
            {PARTICLES.map((p, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.05 + i * 0.02, ease: "easeOut" }}
                className="absolute rounded-full pointer-events-none"
                style={{ width: p.size, height: p.size, background: p.color }}
              />
            ))}

            {/* Card */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.05 }}
              className="glass-card rounded-2xl px-10 py-8 flex flex-col items-center gap-3 text-center max-w-xs mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, -12, 12, -6, 6, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <Trophy className="h-14 w-14 text-amber-400" />
              </motion.div>

              <div>
                <p className="font-display text-2xl font-bold text-amber-400 tracking-widest uppercase">New PR!</p>
                <p className="text-sm text-muted-foreground mt-0.5">{pr.name}</p>
              </div>

              <div>
                <p className="font-display text-5xl font-bold text-foreground">{pr.weight}<span className="text-2xl text-muted-foreground ml-1">kg</span></p>
                <p className="text-sm text-muted-foreground mt-1">{pr.reps} {pr.reps === 1 ? "rep" : "reps"}</p>
              </div>

              <p className="text-xs text-muted-foreground/60 mt-1">Tap anywhere to dismiss</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
