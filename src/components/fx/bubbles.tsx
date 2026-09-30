"use client";

import { useEffect, useState } from "react";

type B = { id: number; size: number; left: number; dur: number; delay: number; drift: number };

/** Soap bubbles rising through the hero. Hover a bubble and it pops. Generated after mount (no SSR mismatch). */
export function Bubbles({ count = 12 }: { count?: number }) {
  const [bubbles, setBubbles] = useState<B[]>([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setBubbles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        size: 14 + Math.random() * 56,
        left: Math.random() * 100,
        dur: 9 + Math.random() * 12,
        delay: -Math.random() * 20,
        drift: (Math.random() - 0.5) * 80,
      })),
    );
  }, [count]);

  return (
    <div aria-hidden className="absolute inset-0 -z-[5] overflow-hidden">
      {bubbles.map((b) => (
        <span key={b.id} className="bubble-rise absolute bottom-[-90px]" style={{ left: `${b.left}%`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ["--drift" as string]: `${b.drift}px` }}>
          <span
            className="block cursor-pointer transition duration-200 hover:scale-[1.7] hover:opacity-0 rounded-full border border-white/60 bg-gradient-to-br from-white/50 to-accent/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.6)] dark:border-white/20 dark:from-white/10 dark:to-accent/10"
            style={{ width: b.size, height: b.size }}
          />
        </span>
      ))}
    </div>
  );
}
