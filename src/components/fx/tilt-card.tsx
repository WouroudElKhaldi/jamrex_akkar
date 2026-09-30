"use client";

import { useRef } from "react";

/**
 * 3D tilt that follows the mouse, with a moving light glare. Touch devices get a plain card.
 * No animation library and no React state: the pointer handler only writes four CSS variables (once per frame)
 * and the browser does the rest, so dozens of cards on one page cost almost nothing.
 */
export function TiltCard({ children, className, max = 8, glare = true }: { children: React.ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const reset = () => {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    delete el.dataset.tilt;
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
  };

  return (
    <div
      ref={ref}
      className={`tilt relative ${className ?? ""}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const { clientX, clientY } = e;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const x = (clientX - r.left) / r.width;
          const y = (clientY - r.top) / r.height;
          el.dataset.tilt = "1";
          el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
          el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
          el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
          el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
        });
      }}
      onPointerLeave={reset}
    >
      {children}
      {glare && <div aria-hidden className="tilt-glare pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light" />}
    </div>
  );
}
