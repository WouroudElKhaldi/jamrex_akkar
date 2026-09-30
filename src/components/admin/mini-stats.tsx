"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/fx/count-up";
import { cn } from "@/lib/utils";

type Stat = { label: string; value: number; tone?: "brand" | "accent" | "warn" | "danger" | "ok"; suffix?: string };
const TONES = { brand: "from-brand to-[#3b6cf6]", accent: "from-accent to-[#12d1ba]", warn: "from-warn to-[#ffcc66]", danger: "from-danger to-[#ff8a8e]", ok: "from-ok to-[#5be3a3]" };

/** Row of small animated counters shown above each admin table. */
export function MiniStats({ stats }: { stats: Stat[] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-card"
        >
          <div className={cn("absolute -end-5 -top-5 h-16 w-16 rounded-full bg-gradient-to-br opacity-25 blur-sm", TONES[s.tone ?? "brand"])} />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
          <p className="mt-1 text-2xl font-black"><CountUp value={s.value} suffix={s.suffix} /></p>
        </motion.div>
      ))}
    </div>
  );
}
